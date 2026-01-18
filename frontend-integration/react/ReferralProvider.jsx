import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ReferralAPI, ReferralHook, ReferralErrors } from '../referral-api.js';

// Create context
const ReferralContext = createContext(null);

/**
 * Referral Provider Component
 * Wraps your app to provide referral functionality throughout
 */
export const ReferralProvider = ({ children, authToken }) => {
  const [api] = useState(() => new ReferralAPI());
  const [hook] = useState(() => new ReferralHook(api));
  const [isInitialized, setIsInitialized] = useState(false);

  // Update auth token when it changes
  useEffect(() => {
    if (authToken) {
      api.setAuthToken(authToken);
      setIsInitialized(true);
    } else {
      setIsInitialized(false);
    }
  }, [authToken, api]);

  // Context value
  const contextValue = {
    api,
    hook,
    isInitialized,
  };

  return (
    <ReferralContext.Provider value={contextValue}>
      {children}
    </ReferralContext.Provider>
  );
};

/**
 * Hook to use referral context
 */
export const useReferral = () => {
  const context = useContext(ReferralContext);

  if (!context) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }

  return context;
};

/**
 * Hook for managing referral sharing links
 */
export const useReferralSharing = () => {
  const { api, isInitialized } = useReferral();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sharingData, setSharingData] = useState(null);

  const generateSharingLinks = useCallback(async (courseId) => {
    if (!isInitialized) {
      setError('Referral system not initialized. Please log in first.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.generateSharingLinks(courseId);

      if (response.success) {
        setSharingData(response.data);
        return response.data;
      } else {
        setError(response.error);
        return null;
      }
    } catch (err) {
      const errorMessage = ReferralErrors.getUserFriendlyMessage(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, isInitialized]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSharingData = useCallback(() => {
    setSharingData(null);
  }, []);

  return {
    generateSharingLinks,
    sharingData,
    loading,
    error,
    clearError,
    clearSharingData,
  };
};

/**
 * Hook for managing referral statistics
 */
export const useReferralStats = () => {
  const { api, isInitialized } = useReferral();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!isInitialized) {
      setError('Referral system not initialized. Please log in first.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getReferralStats();

      if (response.success) {
        setStats(response.data);
        return response.data;
      } else {
        setError(response.error);
        return null;
      }
    } catch (err) {
      const errorMessage = ReferralErrors.getUserFriendlyMessage(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, isInitialized]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch stats when initialized
  useEffect(() => {
    if (isInitialized && !stats && !loading) {
      fetchStats();
    }
  }, [isInitialized, stats, loading, fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    clearError,
  };
};

/**
 * Hook for managing referral links
 */
export const useReferralLinks = () => {
  const { api, isInitialized } = useReferral();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [links, setLinks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLinks = useCallback(async (page = 1) => {
    if (!isInitialized) {
      setError('Referral system not initialized. Please log in first.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getReferralLinks({ page, limit: 10 });

      if (response.success) {
        setLinks(response.data.data || []);
        setPagination(response.data.pagination);
        setCurrentPage(page);
        return response.data;
      } else {
        setError(response.error);
        return null;
      }
    } catch (err) {
      const errorMessage = ReferralErrors.getUserFriendlyMessage(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, isInitialized]);

  const deactivateLink = useCallback(async (linkId) => {
    try {
      const response = await api.deactivateReferralLink(linkId);

      if (response.success) {
        // Update the link in the local state
        setLinks(prev => prev.map(link =>
          link.id === linkId ? { ...link, isActive: false } : link
        ));
        return true;
      } else {
        setError(response.error);
        return false;
      }
    } catch (err) {
      const errorMessage = ReferralErrors.getUserFriendlyMessage(err);
      setError(errorMessage);
      return false;
    }
  }, [api]);

  const reactivateLink = useCallback(async (linkId) => {
    try {
      const response = await api.reactivateReferralLink(linkId);

      if (response.success) {
        // Update the link in the local state
        setLinks(prev => prev.map(link =>
          link.id === linkId ? { ...link, isActive: true } : link
        ));
        return true;
      } else {
        setError(response.error);
        return false;
      }
    } catch (err) {
      const errorMessage = ReferralErrors.getUserFriendlyMessage(err);
      setError(errorMessage);
      return false;
    }
  }, [api]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch links when initialized
  useEffect(() => {
    if (isInitialized && links.length === 0 && !loading) {
      fetchLinks();
    }
  }, [isInitialized, links.length, loading, fetchLinks]);

  return {
    links,
    pagination,
    currentPage,
    loading,
    error,
    fetchLinks,
    deactivateLink,
    reactivateLink,
    clearError,
  };
};

/**
 * Hook for admin referral management
 */
export const useReferralAdmin = () => {
  const { api, isInitialized } = useReferral();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAnalytics = useCallback(async (filters = {}) => {
    if (!isInitialized) {
      setError('Referral system not initialized.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getReferralAnalytics(filters);

      if (response.success) {
        return response.data;
      } else {
        setError(response.error);
        return null;
      }
    } catch (err) {
      const errorMessage = ReferralErrors.getUserFriendlyMessage(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, isInitialized]);

  const getConversions = useCallback(async (params = {}) => {
    if (!isInitialized) {
      setError('Referral system not initialized.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getReferralConversions(params);

      if (response.success) {
        return response.data;
      } else {
        setError(response.error);
        return null;
      }
    } catch (err) {
      const errorMessage = ReferralErrors.getUserFriendlyMessage(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, isInitialized]);

  const markCommissionsAsPaid = useCallback(async (conversionIds) => {
    if (!isInitialized) {
      setError('Referral system not initialized.');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.markCommissionsAsPaid(conversionIds);

      if (response.success) {
        return true;
      } else {
        setError(response.error);
        return false;
      }
    } catch (err) {
      const errorMessage = ReferralErrors.getUserFriendlyMessage(err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [api, isInitialized]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    getAnalytics,
    getConversions,
    markCommissionsAsPaid,
    loading,
    error,
    clearError,
  };
};

/**
 * Event subscription hook
 */
export const useReferralEvents = () => {
  const { hook } = useReferral();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const unsubscribe = hook.subscribe((event, data) => {
      setEvents(prev => [...prev, { event, data, timestamp: Date.now() }]);
    });

    return unsubscribe;
  }, [hook]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    clearEvents,
  };
};
