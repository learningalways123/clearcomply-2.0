import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../services/api';
import type { SSPWorkbook } from '../../../services/api';

interface WorkbookContextProps {
  workbook: SSPWorkbook | null;
  setWorkbook: React.Dispatch<React.SetStateAction<SSPWorkbook | null>>;
  updateSection: (section: string, data: any) => void;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refreshWorkbook: () => Promise<void>;
}

const WorkbookContext = createContext<WorkbookContextProps>({
  workbook: null,
  setWorkbook: () => {},
  updateSection: () => {},
  loading: true,
  saving: false,
  error: null,
  refreshWorkbook: async () => {},
});

export const useWorkbook = () => useContext(WorkbookContext);

export const WorkbookProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { id = '' } = useParams<{ id: string }>();
  const [workbook, setWorkbook] = useState<SSPWorkbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to store the debounce timers for each section to prevent overlaps
  const debounceTimers = useRef<Record<string, any>>({});

  const fetchWorkbook = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getSSPWorkbook(id);
      setWorkbook(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load SSP Workbook.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkbook();
    // Cleanup timers on unmount
    return () => {
      Object.values(debounceTimers.current).forEach(t => clearTimeout(t));
    };
  }, [fetchWorkbook]);

  const updateSection = useCallback((section: string, data: any) => {
    if (!id) return;

    // 1. Optimistic Update (immediate local render)
    setWorkbook(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [section]: data,
      };
    });

    // 2. Debounced API Save
    if (debounceTimers.current[section]) {
      clearTimeout(debounceTimers.current[section]);
    }

    setSaving(true);
    debounceTimers.current[section] = setTimeout(async () => {
      try {
        const updated = await api.updateSSPWorkbookSection(id, section, data);
        // Ensure state is perfectly synced with database payload
        setWorkbook(updated);
      } catch (err) {
        console.error(`Failed to save section ${section}:`, err);
        setError(`Failed to save changes to ${section}.`);
      } finally {
        setSaving(false);
      }
    }, 1000); // 1-second debounce
  }, [id]);

  return (
    <WorkbookContext.Provider value={{
      workbook,
      setWorkbook,
      updateSection,
      loading,
      saving,
      error,
      refreshWorkbook: fetchWorkbook
    }}>
      {children}
    </WorkbookContext.Provider>
  );
};
