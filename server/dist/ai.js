"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callKimi = callKimi;
exports.generateScriptFromAI = generateScriptFromAI;
exports.buildAIPrompt = buildAIPrompt;
const axios_1 = __importDefault(require("axios"));
async function callKimi(systemPrompt, userPrompt, history = []) {
    try {
        console.log('callKimi', systemPrompt, userPrompt, history);
        const resp = await axios_1.default.post('https://api.moonshot.cn/v1/chat/completions', {
            model: 'moonshot-v1-8k',
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: userPrompt },
            ],
        }, {
            headers: {
                Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        return resp.data.choices?.[0]?.message?.content || '';
    }
    catch (e) {
        console.error('callKimi 调用失败：', e?.response?.status, e?.response?.data || e);
        throw e;
    }
}
/**
 * 用 Kimi 生成一个完整的剧本配置（ScriptConfig）
 */
async function generateScriptFromAI(theme, playerCount = 5) {
    const safeCount = Math.min(8, Math.max(4, playerCount || 5));
    const systemPrompt = [
        `你是一名专业的线下剧本杀编剧，擅长创作 ${safeCount} 人的悬疑剧本。`,
        `这次请你为 ${safeCount} 位玩家创作一个完整的剧本，roles 数组的长度必须是 ${safeCount}。`,
        '现在请你只返回一个符合以下结构的 JSON，不能出现任何多余文字：',
        '{',
        '  "title": "剧本标题",',
        '  "background": "世界观和大背景",',
        '  "caseIntro": "案件简单介绍（给玩家看的）",',
        '  "truth": "完整真相（仅主持人可见）",',
        '  "roles": [',
        '    {',
        '      "id": "r1",',
        '      "name": "角色名",',
        '      "identity": "角色身份/职业",',
        '      "publicInfo": "公开信息",',
        '      "secretInfo": "隐藏信息（该角色的秘密）"',
        '    },',
        '    ...',
        '  ]',
        '}',
    ].join('\n');
    const userPrompt = `请围绕主题「${theme || '悬疑'}」为 ${safeCount} 位玩家创作一个剧本，并严格按上述 JSON 结构返回，不能有注释、解释或多余文字。`;
    const content = await callKimi(systemPrompt, userPrompt);
    try {
        const parsed = JSON.parse(content);
        return parsed;
    }
    catch (err) {
        console.error('解析 Kimi 返回失败，使用兜底剧本：', err);
        // fallback 简单剧本
        return {
            title: 'AI 剧本示例',
            background: '一座孤岛上的别墅聚会，风暴导致所有人被困。',
            caseIntro: '有人在夜晚遇害，大家必须找出真凶。',
            truth: '真凶是为了复仇而潜入的客人。',
            roles: [
                {
                    id: 'r1',
                    name: '记者',
                    identity: '调查新闻的记者',
                    publicInfo: '擅长提问，观察细节。',
                    secretInfo: '受害人曾经拒绝过他的爆料请求。',
                },
                {
                    id: 'r2',
                    name: '医生',
                    identity: '随行的私人医生',
                    publicInfo: '懂得急救，性格冷静。',
                    secretInfo: '与受害人有隐秘的恋情。',
                },
                {
                    id: 'r3',
                    name: '保镖',
                    identity: '负责安全',
                    publicInfo: '身手矫健，保护雇主。',
                    secretInfo: '害怕自己的犯罪过去被揭露。',
                },
                {
                    id: 'r4',
                    name: '作家',
                    identity: '神秘小说作者',
                    publicInfo: '善于编造故事，洞察人心。',
                    secretInfo: '正在构思以受害人为原型的新小说。',
                },
            ],
        };
    }
}
/**
 * 根据房间状态构造给 Kimi 的 systemPrompt / userPrompt
 */
function buildAIPrompt(room, userPrompt) {
    const script = room.script;
    const stageLabel = room.stage;
    let truthPart = '';
    if (script) {
        if (stageLabel === 'vote') {
            truthPart = `真相（仅供你参考，请在玩家投票后再揭示）：${script.truth}`;
        }
        else {
            truthPart =
                `你已经知道完整真相，但在当前阶段严禁直接说出凶手是谁、关键证据和作案手法，` +
                    `只能通过线索和引导，让玩家逐步接近真相。`;
        }
    }
    const baseInfo = script
        ? `剧本标题: ${script.title}\n背景: ${script.background}\n案件简介: ${script.caseIntro}\n${truthPart}\n`
        : '暂无剧本。';
    const stageInfo = `当前阶段: ${stageLabel}（setup=导入, clue=线索, debate=辩论, vote=投票）`;
    const historyText = room.messages
        .slice(-10)
        .map((m) => `${m.from}: ${m.content}`)
        .join('\n');
    const systemPrompt = `${baseInfo}\n${stageInfo}\n` +
        `最近聊天记录（从旧到新）：\n${historyText}\n\n` +
        `你是线下剧本杀的主持人（DM），你的目标是：\n` +
        `1. 用自然、口语化的简体中文说话，营造紧张又好玩的氛围。\n` +
        `2. 每次回答控制在 80~200 字。\n` +
        `3. 主动引导玩家提问、讨论、怀疑某些人，而不是直接告诉他们答案。\n` +
        `4. 在投票阶段前，不要暴露真相，只能给出间接提示。\n`;
    return { systemPrompt, userPrompt };
}
