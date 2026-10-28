
import { createClientFromRequest } from '@base44/sdk';
type SuggestionType = 'pacing' | 'interaction' | 'management' | 'general';
type SuggestionPriority = 'high' | 'medium' | 'low';

interface SuggestionResult {
  type?: string;
  priority?: string;
  text?: string;
}

interface LLMResult {
  suggestions?: SuggestionResult[];
}

function getStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = error.status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (error: unknown) {
      if (getStatus(error) === 401) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      throw error;
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: { sessionId?: string } = await req.json().catch(
      (): { sessionId?: string } => ({})
    );
    const { sessionId } = body;

    if (!sessionId) {
      return Response.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    let session;
    try {
      session = await base44.entities.ClassSession.get(sessionId);
    } catch (error: unknown) {
      if (getStatus(error) === 404) {
        return Response.json({ error: 'Session not found' }, { status: 404 });
      }
      throw error;
    }

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const [samplePage, attendancePage] = await Promise.all([
      base44.entities.EngagementSample.filter(
        { session_id: sessionId },
        { sort: 'interval_start', limit: 100 }
      ),
      base44.entities.AttendanceRecord.filter(
        { session_id: sessionId },
        { limit: 200 }
      ),
    ]);

    const samples = samplePage.items ?? [];
    const attendance = attendancePage.items ?? [];

    if (samples.length === 0) {
      return Response.json(
        {
          error:
            'No engagement intervals logged for this session yet. Log at least one interval first.',
        },
        { status: 400 }
      );
    }

    const trendLines = samples
      .map(
        (sample) =>
          `Minutes ${sample.interval_start}-${sample.interval_end}: attention ${sample.attention_score}%, movement ${sample.movement_score}%, inactivity ${sample.inactivity_minutes ?? 0} min, audio activity ${sample.audio_activity}, fused engagement ${Math.round(Number(sample.engagement) || 0)}%${sample.note ? ` (note: ${sample.note})` : ''}`
      )
      .join('\n');

    const presentCount = attendance.filter(
      (record) => record.status === 'present'
    ).length;

    const partialCount = attendance.filter(
      (record) => record.status === 'partial'
    ).length;

    const prompt = [
      'You are an AI teaching coach in a privacy-preserving classroom intelligence system called Multimodal Attendance & Engagement Agent.',
      `Session: "${session.title}", classroom "${session.classroom_name}", planned duration ${session.duration_minutes} minutes.`,
      `Attendance: ${presentCount} students fully present, ${partialCount} partial appearances, ${attendance.length} records in total.`,
      'Engagement trends across time intervals:',
      trendLines,
      '',
      'Produce 3 to 5 concrete, context-aware teaching suggestions. Address engagement drops, pacing, interactive activities, and classroom management where relevant. Suggestions are advisory, never enforced decisions. Keep each suggestion under 45 words.',
    ].join('\n');

    const result = (await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['pacing', 'interaction', 'management', 'general'],
                },
                priority: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                },
                text: { type: 'string' },
              },
              required: ['type', 'priority', 'text'],
            },
          },
        },
        required: ['suggestions'],
      },
    })) as LLMResult;

    const validTypes: SuggestionType[] = [
      'pacing',
      'interaction',
      'management',
      'general',
    ];

    const validPriorities: SuggestionPriority[] = [
      'high',
      'medium',
      'low',
    ];

    const suggestions = (result.suggestions ?? [])
      .slice(0, 5)
      .map((suggestion) => ({
        session_id: sessionId,
        type: validTypes.includes(suggestion.type as SuggestionType)
          ? (suggestion.type as SuggestionType)
          : 'general',
        priority: validPriorities.includes(
          suggestion.priority as SuggestionPriority
        )
          ? (suggestion.priority as SuggestionPriority)
          : 'medium',
        text: String(suggestion.text ?? '').slice(0, 600),
      }))
      .filter((suggestion) => suggestion.text.trim().length > 0);

    await base44.entities.Suggestion.deleteMany({
      session_id: sessionId,
    });

    const saved = suggestions.length
      ? await base44.entities.Suggestion.bulkCreate(suggestions)
      : [];

    return Response.json({ suggestions: saved });
  } catch (error: unknown) {
    return Response.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
