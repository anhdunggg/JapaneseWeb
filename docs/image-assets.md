# Mochi Image Asset Pipeline

Use generated image assets to replace `placehold.co` URLs in Supabase while keeping a consistent Mochi visual style.

## Recommended Style

```text
Modern Japanese minimalist educational illustration, soft washi paper background, gentle natural lighting, muted indigo ink outlines, subtle sakura pink and vermilion accents, clean composition, calm study atmosphere, no text, no watermark.
```

## Vocabulary Prompt Template

```text
Create a modern Japanese minimalist educational illustration for the vocabulary word "{word}" meaning "{meaning}".
Visualize the meaning clearly for a Japanese learner.
Use a soft washi paper background, muted indigo ink outlines, subtle sakura pink and vermilion accents, calm natural lighting, clean uncluttered composition.
No text, no watermark, no labels.
```

## Kanji Prompt Template

```text
Create a modern Japanese minimalist mnemonic illustration for the kanji "{character}" meaning "{meaning}".
Use the mnemonic idea: {mnemonic}
Make the meaning memorable without adding any written text.
Use a soft washi paper background, muted indigo ink outlines, subtle sakura pink and vermilion accents, calm natural lighting.
No text, no watermark, no labels.
```

## Storage Layout

```text
lesson-assets/
  vocabulary/
    watashi.webp
    anata.webp
  kanji/
    kou.webp
    uta.webp
```

## Update Examples

```sql
update vocabulary
set image_url = 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/lesson-assets/vocabulary/watashi.webp'
where word = '私';

update kanji
set image_url = 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/lesson-assets/kanji/kou.webp'
where character = '好';
```

The frontend treats `placehold.co` URLs as unfinished placeholders and displays a Mochi-style fallback automatically. When `image_url` points to a real asset, the real image is shown.
