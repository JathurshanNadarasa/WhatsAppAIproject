import api from './api'

import {
    HealthResponse,
    VersionResponse,
    DatabaseHealthResponse
} from '../types/api'

export const getHealth =async(): Promise<HealthResponse> =>{
    const response = await api.get<HealthResponse>('/health')
    return response.data
}

export const getVersion = async(): Promise<VersionResponse> =>{
    const response = await api.get<VersionResponse>('/version')
    return response.data
}

export const getDatabaseHealth =
    async (): Promise<DatabaseHealthResponse> => {
        const response =
            await api.get<DatabaseHealthResponse>("/health/database");

        return response.data;
    };