import { useState } from 'react';
import axios from 'axios';
import { CrossDeptData, TimelineBuffer } from '../types/crossDeptTypes';

export const useCrossDeptPlanning = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<CrossDeptData | null>(null);
    const [mode, setMode] = useState<'department' | 'balanced'>('department');

    const uploadFile = async (file: File) => {
        setIsLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);

            // POST to /api/v1/worker-tasks/cross-dept-plan
            // Ensure axios baseURL is configured or use relative if proxy setup
            // Assuming Vite proxy or running on same host logic
            const response = await axios.post('/api/v1/worker-tasks/cross-dept-plan', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setData(response.data);
            setMode('department'); // Default to Dept only (Step 2)
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || err.message || 'Upload failed');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleBalance = () => {
        setMode(prev => prev === 'department' ? 'balanced' : 'department');
    };

    const currentPlan = data ? (mode === 'department' ? data.departmentPlan : data.balancedPlan) : null;

    return {
        isLoading,
        error,
        data,
        mode,
        currentPlan,
        uploadFile,
        toggleBalance,
        setMode // explicit set if needed
    };
};
