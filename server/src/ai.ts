import axios from 'axios';
import { ScriptConfig, RoomState } from './types.js';

export async function callKimi(systemPrompt: string, userPrompt: string, history: { role: string; content: string }[] = []) {
  const resp = await axios.post(
    'https://api.moonshot.cn/v1/chat/completions',
    {
      model: 'moonshot-v1-8k',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userPrompt },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return resp.data.choices?.[0]?.message?.content || '';
}

export async function generateScriptFromAI(theme?: string): Promise<ScriptConfig> {
  const systemPrompt = '你是一名专业的剧本杀创作者，请生成一份包含完整角色信息的剧本配置，使用简体中文。';
  const userPrompt = `请生成包含 title, background, caseIntro, truth, roles 的 JSON，角色至少4个。主题: ${theme || '悬疑'}`;
  const content = await callKimi(systemPrompt, userPrompt);

  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch (err) {
    // fallback simple script
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

export function buildAIPrompt(room: RoomState, userPrompt: string) {
  const script = room.script;
  const baseInfo = script
    ? `剧本标题: ${script.title}\n背景: ${script.background}\n案件简介: ${script.caseIntro}\n真相: ${script.truth}\n`
    : '暂无剧本。';
  const stageInfo = `当前阶段: ${room.stage}`;
  const history = room.messages.slice(-10)
    .map((m) => `${m.from}: ${m.content}`)
    .join('\n');
  const systemPrompt = `${baseInfo}\n${stageInfo}\n最近聊天:\n${history}\n请以主持人身份，用简短中文回应。`;
  return { systemPrompt, userPrompt };
}
