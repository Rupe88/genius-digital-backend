import { prisma } from '../config/database.js';
import { validationResult } from 'express-validator';

/** Pick feedback band: highest minScore first so overlapping ranges resolve predictably. */
export function pickScoreBand(totalScore, bands) {
  const active = (bands || []).filter((b) => b.isActive !== false);
  if (active.length === 0) {
    return { label: '—', description: null };
  }
  const sorted = [...active].sort((a, b) => b.minScore - a.minScore);
  for (const b of sorted) {
    if (totalScore >= b.minScore && totalScore <= b.maxScore) {
      return { label: b.label, description: b.description || null, bandId: b.id };
    }
  }
  const fallback = sorted[sorted.length - 1];
  return { label: fallback.label, description: fallback.description || null, bandId: fallback.id };
}

/**
 * GET /limiting-belief/catalog — logged-in user: active sections, questions, bands, computed maxScore
 */
export const getCatalog = async (req, res, next) => {
  try {
    const sections = await prisma.limitingBeliefSection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, text: true, sortOrder: true },
        },
      },
    });

    const bands = await prisma.limitingBeliefScoreBand.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { minScore: 'asc' }],
    });

    const questionCount = sections.reduce((n, s) => n + s.questions.length, 0);
    const maxScore = questionCount * 5;

    res.json({
      success: true,
      data: {
        sections: sections.map((s) => ({
          id: s.id,
          title: s.title,
          sortOrder: s.sortOrder,
          questions: s.questions,
        })),
        bands: bands.map((b) => ({
          id: b.id,
          minScore: b.minScore,
          maxScore: b.maxScore,
          label: b.label,
          description: b.description,
          sortOrder: b.sortOrder,
        })),
        maxScore,
        pointsPerQuestion: 5,
      },
    });
  } catch (e) {
    next(e);
  }
};

/**
 * POST /limiting-belief/attempts — save attempt; body.answers { [questionId]: 1..5 }
 */
export const postAttempt = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, message: 'answers object required' });
    }

    const sections = await prisma.limitingBeliefSection.findMany({
      where: { isActive: true },
      include: {
        questions: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    const expectedIds = sections.flatMap((s) => s.questions.map((q) => q.id));
    const expectedSet = new Set(expectedIds);
    const answerKeys = Object.keys(answers);

    if (expectedIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No published questions configured' });
    }

    if (answerKeys.length !== expectedSet.size || answerKeys.some((k) => !expectedSet.has(k))) {
      return res.status(400).json({
        success: false,
        message: 'Answer every question exactly once',
      });
    }

    let totalScore = 0;
    for (const qid of expectedIds) {
      const v = Number(answers[qid]);
      if (!Number.isInteger(v) || v < 1 || v > 5) {
        return res.status(400).json({
          success: false,
          message: `Invalid score for question (must be 1–5): ${qid}`,
        });
      }
      totalScore += v;
    }

    const bands = await prisma.limitingBeliefScoreBand.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const maxScore = expectedIds.length * 5;
    const { label: bandLabel } = pickScoreBand(totalScore, bands);

    const attempt = await prisma.limitingBeliefAttempt.create({
      data: {
        userId,
        totalScore,
        maxScore,
        bandLabel,
        answersJson: answers,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: attempt.id,
        totalScore,
        maxScore,
        bandLabel,
        createdAt: attempt.createdAt,
      },
    });
  } catch (e) {
    next(e);
  }
};

/** GET /limiting-belief/admin/catalog */
export const getAdminCatalog = async (req, res, next) => {
  try {
    const [sections, bands] = await Promise.all([
      prisma.limitingBeliefSection.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          questions: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      prisma.limitingBeliefScoreBand.findMany({
        orderBy: [{ sortOrder: 'asc' }, { minScore: 'asc' }],
      }),
    ]);

    const qCount = sections.reduce((n, s) => n + s.questions.filter((q) => q.isActive).length, 0);
    res.json({
      success: true,
      data: { sections, bands, maxScorePublished: qCount * 5 },
    });
  } catch (e) {
    next(e);
  }
};

export const createSection = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { title, sortOrder, isActive } = req.body;
    const section = await prisma.limitingBeliefSection.create({
      data: {
        title: title.trim(),
        sortOrder: sortOrder ?? 0,
        isActive: isActive !== false,
      },
    });
    res.status(201).json({ success: true, data: section });
  } catch (e) {
    next(e);
  }
};

export const updateSection = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { id } = req.params;
    const { title, sortOrder, isActive } = req.body;
    const data = {};
    if (title !== undefined) data.title = String(title).trim();
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const section = await prisma.limitingBeliefSection.update({
      where: { id },
      data,
    });
    res.json({ success: true, data: section });
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    next(e);
  }
};

export const deleteSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.limitingBeliefSection.delete({ where: { id } });
    res.json({ success: true, message: 'Section deleted' });
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    next(e);
  }
};

export const createQuestion = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { sectionId, text, sortOrder, isActive } = req.body;
    const section = await prisma.limitingBeliefSection.findUnique({ where: { id: sectionId } });
    if (!section) {
      return res.status(400).json({ success: false, message: 'Section not found' });
    }
    const question = await prisma.limitingBeliefQuestion.create({
      data: {
        sectionId,
        text: String(text).trim(),
        sortOrder: sortOrder ?? 0,
        isActive: isActive !== false,
      },
    });
    res.status(201).json({ success: true, data: question });
  } catch (e) {
    next(e);
  }
};

export const updateQuestion = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { id } = req.params;
    const { text, sortOrder, isActive, sectionId } = req.body;
    const data = {};
    if (text !== undefined) data.text = String(text).trim();
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (sectionId !== undefined) {
      const sec = await prisma.limitingBeliefSection.findUnique({ where: { id: sectionId } });
      if (!sec) {
        return res.status(400).json({ success: false, message: 'Section not found' });
      }
      data.sectionId = sectionId;
    }

    const question = await prisma.limitingBeliefQuestion.update({
      where: { id },
      data,
    });
    res.json({ success: true, data: question });
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    next(e);
  }
};

export const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.limitingBeliefQuestion.delete({ where: { id } });
    res.json({ success: true, message: 'Question deleted' });
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    next(e);
  }
};

export const createScoreBand = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { minScore, maxScore, label, description, sortOrder, isActive } = req.body;
    const band = await prisma.limitingBeliefScoreBand.create({
      data: {
        minScore: Number(minScore),
        maxScore: Number(maxScore),
        label: String(label).trim(),
        description: description != null ? String(description) : null,
        sortOrder: sortOrder ?? 0,
        isActive: isActive !== false,
      },
    });
    res.status(201).json({ success: true, data: band });
  } catch (e) {
    next(e);
  }
};

export const updateScoreBand = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { id } = req.params;
    const { minScore, maxScore, label, description, sortOrder, isActive } = req.body;
    const data = {};
    if (minScore !== undefined) data.minScore = Number(minScore);
    if (maxScore !== undefined) data.maxScore = Number(maxScore);
    if (label !== undefined) data.label = String(label).trim();
    if (description !== undefined) data.description = description === null || description === '' ? null : String(description);
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const band = await prisma.limitingBeliefScoreBand.update({
      where: { id },
      data,
    });
    res.json({ success: true, data: band });
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Score band not found' });
    }
    next(e);
  }
};

export const deleteScoreBand = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.limitingBeliefScoreBand.delete({ where: { id } });
    res.json({ success: true, message: 'Score band deleted' });
  } catch (e) {
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Score band not found' });
    }
    next(e);
  }
};

export const listAttempts = async (req, res, next) => {
  try {
    const take = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = Math.max(0, Number(req.query.offset) || 0);

    const [items, total] = await Promise.all([
      prisma.limitingBeliefAttempt.findMany({
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, fullName: true },
          },
        },
      }),
      prisma.limitingBeliefAttempt.count(),
    ]);

    res.json({
      success: true,
      data: {
        attempts: items.map((a) => ({
          id: a.id,
          totalScore: a.totalScore,
          maxScore: a.maxScore,
          bandLabel: a.bandLabel,
          createdAt: a.createdAt,
          user: a.user,
        })),
        total,
        take,
        skip,
      },
    });
  } catch (e) {
    next(e);
  }
};
