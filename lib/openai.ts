import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Content safety: verify premise is actually a children's story idea (not news, homework, etc.)
export async function validatePremise(premise: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a gatekeeper for a children's storybook app. Your ONLY job is to decide if the user's input is a valid children's story idea.
          
          ALLOW: story ideas, character descriptions, adventure plots, animal tales, fairy tales, moral lessons, fantasy, friendship stories, bedtime stories, etc.
          REJECT: news requests, homework help, code generation, adult topics, political topics, war/violence, real-world current events, general knowledge questions, anything that is NOT a children's story premise.
          
          Reply with ONLY a JSON object: {"safe": true} or {"safe": false, "reason": "brief kid-friendly explanation"}`
        },
        { role: 'user', content: premise }
      ],
      temperature: 0,
      max_tokens: 100,
    });
    const content = res.choices[0].message.content || '{"safe": true}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { safe: true };
  }
}

// Content safety: check user input via OpenAI moderation API
export async function moderateContent(text: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    const res = await openai.moderations.create({ input: text });
    const result = res.results[0];
    if (result.flagged) {
      const flagged = Object.entries(result.categories)
        .filter(([, v]) => v)
        .map(([k]) => k);
      return { safe: false, reason: `Content flagged: ${flagged.join(', ')}` };
    }
    return { safe: true };
  } catch {
    return { safe: true }; // fail open if moderation API errors
  }
}

// Content safety: verify generated story is kid-appropriate
export async function verifyKidFriendly(storyText: string): Promise<{ safe: boolean; reason?: string }> {
  // First pass: moderation API
  const mod = await moderateContent(storyText);
  if (!mod.safe) return mod;

  // Second pass: GPT classifier for subtle issues moderation API misses
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a children's content safety reviewer. Evaluate if the text is appropriate for a children's storybook (ages 2-10). 
          Flag if it contains: violence, scary themes, adult topics, inappropriate language, discrimination, or anything unsuitable for young children.
          Reply with ONLY a JSON object: {"safe": true} or {"safe": false, "reason": "brief explanation"}`
        },
        { role: 'user', content: storyText }
      ],
      temperature: 0,
    });
    const content = res.choices[0].message.content || '{"safe": true}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { safe: true };
  }
}

export async function generateStoryOutline(premise: string, category: string, pageCount: number = 6, title: string = '', detailLevel: number = 3) {
  const detailMap: Record<number, { sentences: string; vocab: string; ageLabel: string }> = {
    1: { sentences: '1 simple sentence', vocab: 'very simple words a toddler would understand', ageLabel: 'ages 2-3' },
    2: { sentences: '2 short sentences', vocab: 'simple words for early readers', ageLabel: 'ages 4-5' },
    3: { sentences: '3-4 sentences forming a descriptive paragraph', vocab: 'age-appropriate vocabulary', ageLabel: 'ages 5-7' },
    4: { sentences: '4-5 rich, descriptive sentences', vocab: 'slightly advanced but accessible vocabulary', ageLabel: 'ages 7-9' },
    5: { sentences: '5-6 detailed sentences with vivid descriptions', vocab: 'expressive vocabulary with some challenging words', ageLabel: 'ages 8-10' },
  };
  const detail = detailMap[detailLevel] || detailMap[3];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a children's storybook author. Create engaging, age-appropriate stories for ${detail.ageLabel}. 
        Stories should have clear morals, colorful descriptions perfect for illustration, and ${detail.vocab}.
        Each page MUST have exactly ${detail.sentences} — this is critical, do not write less.
        
        IMPORTANT RULES:
        1. If the title or premise contains a person's name, that MUST be the main character's name. 
           For example, if the title is "Mia's Dino Adventure", the main character is named Mia. 
           NEVER substitute a different name like Tommy, Sam, etc.
        2. Use the character's actual name consistently on every page.`
      },
      {
        role: 'user',
        content: `Create a ${pageCount}-page children's storybook for ${detail.ageLabel}.
        Title: "${title}"
        Premise: "${premise}"
        Category: ${category}
        Detail: Each page must have ${detail.sentences}. This is the most important formatting rule.
        
        Return a JSON object with:
        - "description": a warm, engaging 1-sentence description of the story suitable for sharing (e.g., "Zahra and Amir, curious 6-year-old twins, discover a magical dinosaur world hidden in their backyard jungle."). Use the character's name, age, and the story's emotional hook. Make it feel like a book jacket blurb.
        - "characterSheet": an object describing the main character's visual appearance for consistent illustrations:
          - "name": the character's name (extract from title/premise, or create one)
          - "appearance": a detailed, fixed visual description of the character (e.g., "a 6-year-old boy with short curly brown hair, brown eyes, light brown skin, wearing a red t-shirt with a star on it and blue jeans"). Do NOT include character names — describe only their physical look.
          - "style": the art style to use (e.g., "Pixar-style 3D cartoon" or "bright watercolor storybook illustration")
        - "pages": an array of exactly ${pageCount} objects, each having:
          - "pageNumber": number (1-based)
          - "text": the story text for that page (${detail.sentences} — NOT fewer). Use the character's REAL name, never a substitute.
          - "imageDescription": a vivid description of what the illustration should show for an artist. NEVER use character names — refer to them as "the boy", "the girl", "the child", "the children", etc. ALWAYS include the character's full appearance description (from characterSheet) so every illustration looks the same. Describe pose, setting, and action but keep the character's look identical.
        
        Make it fun, colorful, and with a positive message at the end!
        Return ONLY valid JSON, no markdown fencing.`
      }
    ],
    temperature: 0.8,
  });

  const content = response.choices[0].message.content || '{}';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

export async function regeneratePageText(currentText: string, instruction: string, storyContext: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a children's storybook author. Rewrite the given page text based on the user's instruction. 
        Keep it age-appropriate for kids 5-8, 3-4 descriptive sentences per page.`
      },
      {
        role: 'user',
        content: `Story context: ${storyContext}
        
        Current page text: "${currentText}"
        
        Instruction: ${instruction}
        
        Return a JSON object with:
        - "text": the rewritten page text
        - "imageDescription": updated illustration description for DALL-E
        
        Return ONLY valid JSON.`
      }
    ],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || '{}';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

export async function generateImage(prompt: string, characterSheet?: { name: string; appearance: string; style: string }): Promise<string> {
  let fullPrompt: string;
  if (characterSheet) {
    // Sanitize for DALL-E safety: remove real names but keep age/appearance details
    const names = characterSheet.name.split(/\s+and\s+|\s*,\s*/).map(n => n.trim()).filter(Boolean);
    const namePattern = names.length > 0 ? new RegExp(`\\b(${names.join('|')})\\b`, 'gi') : null;
    const stripNames = (text: string) => {
      if (namePattern) return text.replace(namePattern, 'the character');
      return text;
    };
    const sanitizedAppearance = stripNames(characterSheet.appearance);
    const sanitizedPrompt = stripNames(prompt);
    fullPrompt = `${characterSheet.style} children's storybook illustration, colorful, friendly, suitable for ages 5-8.

CHARACTER (must look EXACTLY like this in every image): ${sanitizedAppearance}

SCENE: ${sanitizedPrompt}

IMPORTANT: Maintain perfect visual consistency across illustrations.
Do NOT include any text or words in the image.`;
  } else {
    fullPrompt = `Children's storybook illustration, colorful, friendly, cartoon style, suitable for ages 5-8: ${prompt}. Do NOT include any text or words in the image.`;
  }

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: fullPrompt,
    size: '1024x1024',
    quality: 'medium',
  });

  // gpt-image-1 returns base64-encoded image data (no URL)
  return response.data?.[0]?.b64_json || '';
}

export async function syncImageDescriptions(
  editedPages: { pageNumber: number; text: string }[],
  storyContext: string,
  characterSheet?: { name: string; appearance: string; style: string }
): Promise<{ pageNumber: number; imageDescription: string }[]> {
  const charDesc = characterSheet
    ? `Main character: ${characterSheet.name} — ${characterSheet.appearance}. Art style: ${characterSheet.style}.`
    : '';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an illustrator's assistant for a children's storybook. Given page text, write a vivid image description for each page that a DALL·E illustrator can use.
        ${charDesc}
        
        RULES:
        1. Each description should capture the key scene, characters, poses, setting, and mood.
        2. If a character sheet is provided, include the character's full appearance in EVERY description for visual consistency.
        3. NEVER use character names in descriptions — refer to them as "the boy", "the girl", "the child", etc. Names trigger safety filters in image generators.
        4. Keep descriptions concise but visually rich (2-3 sentences).
        5. Return ONLY valid JSON, no markdown fencing.`
      },
      {
        role: 'user',
        content: `Full story context: ${storyContext}

Generate image descriptions for these edited pages:
${editedPages.map(p => `Page ${p.pageNumber}: "${p.text}"`).join('\n')}

Return a JSON array: [{"pageNumber": N, "imageDescription": "..."}]`
      }
    ],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || '[]';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// ============================================================================
// STORY COACH (pivot) — AI coaches, it never authors.
// See STORY_COACH_CONTEXT.md. Rules: child is always the author; praise before
// correction; ask, don't tell; one improvement at a time; never write paragraphs.
// ============================================================================

export interface CoachStoryState {
  hero: string;
  heroName: string;
  setting: string;
  problem: string;
  ageLevel?: number; // 1-3 (5-7), 2 (8-10), 3 (11-13) — see detail below
}

const coachAgeGuidance: Record<number, string> = {
  1: 'Ages 5-7: very short prompts, lots of encouragement, focus on imagination, minimal corrections.',
  2: 'Ages 8-10: introduce story structure, encourage dialogue, teach description, light grammar.',
  3: 'Ages 11-13: richer vocabulary, character motivation, plot twists, revision skills.',
};

// Coach the child forward: praise + ONE guiding question (+ optional tiny tip).
// NEVER writes the next sentence/paragraph for the child.
export async function coachResponse(
  state: CoachStoryState,
  currentPageText: string,
  storySoFar: string
): Promise<{ praise: string; question: string; tip?: string; choices?: string[] }> {
  const age = coachAgeGuidance[state.ageLevel || 1];
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Story Coach — a warm, encouraging writing coach for a child. You feel like a favorite teacher, supportive parent, and curious friend. You NEVER a critic, chatbot, or lecturer.

ABSOLUTE RULES (never break):
1. The child is ALWAYS the author. NEVER write the story, a sentence, or a paragraph for them.
2. Praise FIRST — always begin with something genuine about what they wrote.
3. Ask, don't tell. Offer ONE guiding question that helps them add more (e.g. "What does the forest smell like?" not "Add description.").
4. ONE improvement at a time. Never overwhelm.
5. If the child seems stuck (very short or empty text), offer 3-4 idea CHOICES for what could happen next, but make clear THEY still choose or invent their own. Never pick for them.
6. Keep it short, playful, and age-appropriate. ${age}

Return ONLY JSON: {"praise": "...", "question": "...", "tip": "(optional, one tiny, gentle suggestion — omit if not needed)", "choices": ["(optional 3-4 short what-happens-next ideas, only when the child is stuck)"]}`,
        },
        {
          role: 'user',
          content: `Story so far: hero is ${state.heroName} (a ${state.hero}), in ${state.setting}, facing this problem: ${state.problem}.
Full draft so far: "${storySoFar || '(nothing yet)'}"
What the child just wrote on this page: "${currentPageText || '(blank — they are stuck and need gentle ideas)'}"

Respond as the coach. Celebrate their effort, then ask ONE question to help them keep writing. Never write their story for them.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 300,
    });
    const content = res.choices[0].message.content || '{}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      praise: parsed.praise || 'I love where this is going!',
      question: parsed.question || 'What happens next?',
      tip: parsed.tip || undefined,
      choices: Array.isArray(parsed.choices) && parsed.choices.length ? parsed.choices : undefined,
    };
  } catch {
    return { praise: 'Great work so far! ✨', question: 'What happens next in your story?' };
  }
}

// Review the child's FINISHED draft. Returns granular, one-at-a-time suggestions
// the child can accept or ignore. Praise before correction; never rewrites wholesale.
export interface CoachSuggestion {
  pageNumber: number;
  type: 'spelling' | 'grammar' | 'punctuation' | 'vocabulary' | 'clarity';
  original: string;
  suggestion: string;
  why: string;
}
export async function reviewStory(
  pages: { pageNumber: number; text: string }[]
): Promise<{ celebration: string; strength: string; suggestions: CoachSuggestion[] }> {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Story Coach reviewing a child's finished story. Follow the feedback formula: (1) celebrate, (2) highlight ONE genuine strength, (3) offer small, specific suggestions the child can accept or ignore. NEVER rewrite whole pages. NEVER be harsh. Keep the child's voice and ideas intact.

Each suggestion must be tiny and targeted: fix a specific spelling/grammar/punctuation issue, or gently offer a stronger word/clearer phrasing. Quote the exact original snippet and the improved snippet. Keep the child's meaning.

Return ONLY JSON: {"celebration": "warm celebration of finishing", "strength": "one genuine strength you noticed", "suggestions": [{"pageNumber": N, "type": "spelling|grammar|punctuation|vocabulary|clarity", "original": "exact snippet", "suggestion": "improved snippet", "why": "short kid-friendly reason"}]}
Return at most 8 suggestions total, prioritizing the most helpful. If the writing is already great, return few or none.`,
        },
        {
          role: 'user',
          content: `Here is the child's story:\n${pages.map((p) => `Page ${p.pageNumber}: "${p.text}"`).join('\n')}`,
        },
      ],
      temperature: 0.4,
    });
    const content = res.choices[0].message.content || '{}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      celebration: parsed.celebration || 'You finished a real story! 🎉',
      strength: parsed.strength || 'Your imagination really shines here.',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    return { celebration: 'You finished a real story! 🎉', strength: 'Your imagination really shines here.', suggestions: [] };
  }
}

// Build a fixed character sheet ONCE from the child's setup, so every unlocked
// illustration stays visually consistent. Does not author the story.
export async function generateCharacterSheet(
  hero: string,
  heroName: string,
  setting: string
): Promise<{ name: string; appearance: string; style: string }> {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You design a consistent visual for a children's book character. Given a hero type, name, and setting, invent a friendly, fixed appearance for illustrations.
Return ONLY JSON: {"name": "the name", "appearance": "detailed fixed physical look — NO names, describe only how they look, e.g. 'a small green dragon with big friendly eyes, tiny wings, and a round belly'", "style": "bright watercolor storybook illustration"}`,
        },
        { role: 'user', content: `Hero: ${hero}. Name: ${heroName}. Setting: ${setting}.` },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    const content = res.choices[0].message.content || '{}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      name: parsed.name || heroName,
      appearance: parsed.appearance || `a friendly ${hero}`,
      style: parsed.style || 'bright watercolor storybook illustration',
    };
  } catch {
    return { name: heroName, appearance: `a friendly ${hero}`, style: 'bright watercolor storybook illustration' };
  }
}

// Turn the CHILD'S written page text into an illustration description (no names).
// Used for the illustration-unlock reward — art comes from what the child wrote.
export async function describeSceneFromText(
  pageText: string,
  storyContext: string,
  characterSheet?: { name: string; appearance: string; style: string }
): Promise<string> {
  const charDesc = characterSheet
    ? `Main character always looks like: ${characterSheet.appearance}. Art style: ${characterSheet.style}.`
    : '';
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an illustrator's assistant for a children's storybook. Given the child's page text, write ONE vivid image description an illustrator can draw.
${charDesc}
RULES: never use character names (say "the dragon", "the child"); include the character's fixed appearance for consistency; capture the scene, pose, setting, and mood in 2-3 sentences. Return ONLY the description text, no JSON, no quotes.`,
        },
        { role: 'user', content: `Story context: ${storyContext}\n\nThis page: "${pageText}"` },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    return (res.choices[0].message.content || pageText).trim();
  } catch {
    return pageText;
  }
}

export async function generateCoverImage(title: string, description: string, category: string, characterSheet?: { name: string }): Promise<string> {
  // Sanitize names from title/description to avoid DALL-E safety rejections
  let safeTitle = title;
  let safeDescription = description;
  if (characterSheet) {
    const names = characterSheet.name.split(/\s+and\s+|\s*,\s*/).map(n => n.trim()).filter(Boolean);
    if (names.length > 0) {
      const namePattern = new RegExp(`\\b(${names.join('|')})\\b`, 'gi');
      safeTitle = title.replace(namePattern, 'the character');
      safeDescription = description.replace(namePattern, 'the character');
    }
  }
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: `Vivid, colorful children's storybook cover illustration of fictional cartoon characters, eye-catching, cartoon style for ages 5-8. 
    Title: "${safeTitle}". Story about: ${safeDescription}. Category: ${category}. 
    Make it vibrant and appealing to young readers. Do NOT include any text in the image.`,
    size: '1024x1024',
    quality: 'medium',
  });

  // gpt-image-1 returns base64-encoded image data (no URL)
  return response.data?.[0]?.b64_json || '';
}
