
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendNotification = internalAction({
    args: {
        type: v.string(), // 'rental' or 'subscription'
        name: v.string(),
        phone: v.string(),
        selectedAmount: v.string(),
        address: v.string(),
    },
    handler: async (ctx, args) => {
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (!webhookUrl) return;

        const title = args.type === 'subscription' ? '🏠 스마트 구독 서비스(할부) 신청 알림' : '🛡️ 렌탈 서비스 신청 알림';
        const color = args.type === 'subscription' ? 0x1a3a3a : 0x2c3e50;

        const content = {
            embeds: [
                {
                    title: title,
                    color: color,
                    fields: [
                        { name: '👤 고객명', value: args.name, inline: true },
                        { name: '📞 연락처', value: args.phone, inline: true },
                        { name: '💰 신청내용', value: args.selectedAmount, inline: true },
                        { name: '📍 주소', value: args.address || '정보 없음' },
                        { name: '🕒 신청일시', value: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) },
                    ],
                    footer: { text: 'KCC 견적계산(책임견적) 어드민' }
                }
            ]
        };

        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(content),
            });
        } catch (error) {
            console.error('Discord notification failed:', error);
        }
    },
});
