import api from './api'

import{
    ConversationResponse,
    ConversationsResponse,
    MessagesResponse
} from '../types/conversation'

export const getConversations = async():Promise<ConversationsResponse>=>{
    const response = await api.get<ConversationsResponse>('/conversations')
    return response.data
}

export const getConversation =
    async (
        id: number
    ): Promise<ConversationResponse> => {
        const response =
            await api.get<ConversationResponse>(
                `/conversations/${id}`
            );

        return response.data;
    };

    export const getConversationMessages =
    async (
        id: number
    ): Promise<MessagesResponse> => {
        const response =
            await api.get<MessagesResponse>(
                `/conversations/${id}/messages`
            );

        return response.data;
    };