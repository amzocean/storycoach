import { NextRequest, NextResponse } from 'next/server';
import { generateStoryOutline, regeneratePageText, generateImage, generateCoverImage, syncImageDescriptions, moderateContent, verifyKidFriendly, validatePremise, coachResponse, reviewStory, generateCharacterSheet, describeSceneFromText } from '@/lib/openai';
import { saveBase64Image } from '@/lib/storage';
import { checkRateLimit } from '@/lib/rate-limit';

// Image generation + upload can exceed 60s
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      case 'outline': {
        const { premise, category, pageCount, title, detailLevel } = body;

        // Rate limit check (IP-based, 5 stories/hour)
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const rateCheck = checkRateLimit(ip);
        if (!rateCheck.allowed) {
          return NextResponse.json({ error: rateCheck.message }, { status: 429 });
        }

        // Safety check 1: moderation API (catches overtly harmful content)
        const inputCheck = await moderateContent(`${title} ${premise}`);
        if (!inputCheck.safe) {
          return NextResponse.json({ error: `🚫 ${inputCheck.reason}. Please keep it kid-friendly!` }, { status: 400 });
        }

        // Safety check 2: validate premise is actually a children's story idea
        const premiseCheck = await validatePremise(`${title} ${premise}`);
        if (!premiseCheck.safe) {
          return NextResponse.json({ error: `🚫 ${premiseCheck.reason || "That doesn't look like a story idea!"} Try something like "A brave kitten who learns to fly" 🐱` }, { status: 400 });
        }

        const result = await generateStoryOutline(premise, category, pageCount || 6, title || '', detailLevel || 3);
        const outline = result.pages || result;
        const characterSheet = result.characterSheet || null;
        const description = result.description || null;

        // Safety check 3: verify generated story is kid-appropriate
        const storyText = (outline as any[]).map((p: any) => p.text).join('\n');
        const outputCheck = await verifyKidFriendly(storyText);
        if (!outputCheck.safe) {
          return NextResponse.json({ error: `🚫 Generated story wasn't kid-friendly (${outputCheck.reason}). Try a different premise!` }, { status: 400 });
        }

        return NextResponse.json({ outline, characterSheet, description });
      }

      case 'regenerate-page': {
        const { currentText, instruction, storyContext } = body;
        const result = await regeneratePageText(currentText, instruction, storyContext);
        return NextResponse.json(result);
      }

      case 'generate-image': {
        const startTime = Date.now();
        const { prompt, storyId, pageNumber, characterSheet } = body;
        const b64Data = await generateImage(prompt, characterSheet || undefined);
        console.log(`[generate-image] Image gen took ${Date.now() - startTime}ms for page ${pageNumber}`);
        const savedPath = await saveBase64Image(b64Data, storyId, `page-${pageNumber}.png`);
        console.log(`[generate-image] Total took ${Date.now() - startTime}ms for page ${pageNumber}`);
        return NextResponse.json({ imageUrl: savedPath });
      }

      case 'generate-cover': {
        const startTime = Date.now();
        const { title, description, category, storyId, characterSheet } = body;
        const b64Data = await generateCoverImage(title, description, category, characterSheet || undefined);
        console.log(`[generate-cover] Image gen took ${Date.now() - startTime}ms`);
        const savedPath = await saveBase64Image(b64Data, storyId, 'cover.png');
        console.log(`[generate-cover] Total took ${Date.now() - startTime}ms`);
        return NextResponse.json({ imageUrl: savedPath });
      }

      case 'sync-descriptions': {
        const { editedPages, storyContext, characterSheet } = body;
        const results = await syncImageDescriptions(editedPages, storyContext, characterSheet || undefined);
        return NextResponse.json({ descriptions: results });
      }

      // ===== STORY COACH (pivot) actions — AI coaches, never authors =====

      case 'character-sheet': {
        const { hero, heroName, setting } = body;
        const sheet = await generateCharacterSheet(hero, heroName, setting);
        return NextResponse.json({ characterSheet: sheet });
      }

      case 'coach-response': {
        const { state, currentPageText, storySoFar } = body;
        // Safety: screen the child's own text before coaching on it
        const check = await moderateContent(`${storySoFar} ${currentPageText}`);
        if (!check.safe) {
          return NextResponse.json({ error: `🚫 ${check.reason}. Let's keep our story kind and kid-friendly!` }, { status: 400 });
        }
        const coach = await coachResponse(state, currentPageText || '', storySoFar || '');
        return NextResponse.json(coach);
      }

      case 'review-story': {
        const { pages } = body;
        const storyText = (pages as any[]).map((p: any) => p.text).join('\n');
        const check = await moderateContent(storyText);
        if (!check.safe) {
          return NextResponse.json({ error: `🚫 ${check.reason}. Please keep it kid-friendly!` }, { status: 400 });
        }
        const review = await reviewStory(pages);
        return NextResponse.json(review);
      }

      case 'generate-illustration': {
        // Illustration is a REWARD for the child's writing — built from their own text.
        const { pageText, storyContext, storyId, pageNumber, characterSheet } = body;
        const inputCheck = await moderateContent(pageText || '');
        if (!inputCheck.safe) {
          return NextResponse.json({ error: `🚫 ${inputCheck.reason}. Let's keep it kid-friendly!` }, { status: 400 });
        }
        const description = await describeSceneFromText(pageText || '', storyContext || '', characterSheet || undefined);
        const b64Data = await generateImage(description, characterSheet || undefined);
        const savedPath = await saveBase64Image(b64Data, storyId, `page-${pageNumber}.png`);
        return NextResponse.json({ imageUrl: savedPath, imagePrompt: description });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
