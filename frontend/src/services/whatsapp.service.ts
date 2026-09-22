import api from "./api";

export interface SendWhatsAppResponse {
    success: boolean;
    message: string;
    data: {
        whatsapp: {
            messaging_product: string;
            contacts: {
                input: string;
                wa_id: string;
            }[];
            messages: {
                id: string;
            }[];
        };
        database: {
            customer: {
                id: number;
                name: string | null;
                phone: string;
                email: string | null;
            };
            conversationId: number;
            message: {
                id: number;
                conversation_id: number;
                sender_type: string;
                message_type: string;
                message_text: string;
                whatsapp_message_id: string;
                created_at: string;
            };
        };
    };
}

export const sendWhatsAppMessage = async (
    to: string,
    message: string
): Promise<SendWhatsAppResponse> => {
    const response = await api.post<SendWhatsAppResponse>(
        "/whatsapp/send",
        {
            to,
            message,
        }
    );

    return response.data;
};