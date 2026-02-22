/**
 * Video optimization service using FFmpeg
 * Optimizes MP4 videos by moving moov atom to the beginning (faststart)
 * This enables progressive streaming without requiring full download
 */

import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// If FFMPEG_PATH is set (e.g. on VPS where Node process PATH doesn't include ffmpeg), use it
const ffmpegPath = process.env.FFMPEG_PATH?.trim();
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

/**
 * Optimize video buffer by moving MP4 metadata to the beginning
 * @param {Buffer} buffer - Video file buffer
 * @param {Object} options - Optimization options
 * @param {number} options.timeout - Timeout in milliseconds (default: 300000 = 5 min)
 * @returns {Promise<Buffer>} Optimized video buffer or original buffer on failure
 */
export async function optimizeVideoBuffer(buffer, options = {}) {
  const timeout = options.timeout || 300000; // 5 minutes default
  const tempDir = os.tmpdir();
  
  // Generate unique filenames
  const inputId = crypto.randomBytes(8).toString('hex');
  const outputId = crypto.randomBytes(8).toString('hex');
  const inputPath = path.join(tempDir, `video-input-${inputId}.mp4`);
  const outputPath = path.join(tempDir, `video-output-${outputId}.mp4`);

  // Validate buffer
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Invalid video buffer: must be a non-empty Buffer');
  }

  try {
    // Write buffer to temporary input file
    console.log(`[Video optimization] Writing ${buffer.length} bytes to temp file: ${inputPath}`);
    await fs.writeFile(inputPath, buffer);

    // Run FFmpeg optimization
    console.log('[Video optimization] Starting FFmpeg optimization...');
    const optimizedBuffer = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Video optimization timed out after ${timeout / 1000} seconds`));
      }, timeout);

      ffmpeg(inputPath)
        .outputOptions([
          '-c copy',              // Copy streams without re-encoding (fast, no quality loss)
          '-movflags +faststart'  // Move moov atom to beginning (enables progressive playback)
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('[Video optimization] FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[Video optimization] Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', async () => {
          clearTimeout(timeoutId);
          try {
            // Read optimized file
            const optimized = await fs.readFile(outputPath);
            console.log(`[Video optimization] Optimization complete. Original: ${buffer.length} bytes, Optimized: ${optimized.length} bytes`);
            resolve(optimized);
          } catch (readError) {
            reject(new Error(`Failed to read optimized file: ${readError.message}`));
          }
        })
        .on('error', (error, stdout, stderr) => {
          clearTimeout(timeoutId);
          console.error('[Video optimization] FFmpeg error:', error.message);
          console.error('[Video optimization] FFmpeg stderr:', stderr);
          reject(new Error(`FFmpeg optimization failed: ${error.message}`));
        })
        .run();
    });

    return optimizedBuffer;
  } catch (error) {
    console.error('[Video optimization] Error during optimization:', error.message);
    // Return original buffer on failure (graceful fallback)
    console.warn('[Video optimization] Falling back to original buffer');
    return buffer;
  } finally {
    // Clean up temporary files
    try {
      await Promise.all([
        fs.unlink(inputPath).catch(() => {}), // Ignore errors if file doesn't exist
        fs.unlink(outputPath).catch(() => {}), // Ignore errors if file doesn't exist
      ]);
      console.log('[Video optimization] Temporary files cleaned up');
    } catch (cleanupError) {
      console.warn('[Video optimization] Error cleaning up temp files:', cleanupError.message);
      // Don't throw - cleanup errors shouldn't break the flow
    }
  }
}

/**
 * Check if FFmpeg is available on the system
 * @returns {Promise<boolean>} True if FFmpeg is available
 */
export async function isFFmpegAvailable() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableEncoders((err, encoders) => {
      if (err) {
        console.warn('[Video optimization] FFmpeg not available:', err.message);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

export default {
  optimizeVideoBuffer,
  isFFmpegAvailable,
};
