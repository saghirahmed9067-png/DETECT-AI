import { db } from '../db.js'
import { logger } from '../logger.js'
import { config } from '../config.js'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuid } from 'uuid'

// Known free HF datasets for AI detection training
const SOURCES = {
  text: [
    { name: 'gpt4all-text', hf_id: 'nomic-ai/gpt4all-j-prompt-generations', label: 'ai',    split: 'train' },
    { name: 'openwebtext',  hf_id: 'Skylion007/openwebtext',                  label: 'human', split: 'train' },
    { name: 'hc3-text',     hf_id: 'Hello-SimpleAI/HC3',                      label: 'ai',    split: 'train' },
  ],
  image: [
    { name: 'civitai-subset', hf_id: 'multimodalart/civitai-data-on-a-diet', label: 'ai',    split: 'train' },
    { name: 'real-photos',    hf_id: 'datasets/imagenet-1k',                  label: 'human', split: 'train' },
  ],
  audio: [
    { name: 'common-voice',  hf_id: 'mozilla-foundation/common_voice_11_0',   label: 'human', split: 'train' },
    { name: 'fake-or-real',  hf_id: 'MelyssaFaraj/fake_or_real_audio',        label: 'ai',    split: 'train' },
  ],
}

async function scrapeTextSample(source, limit) {
  logger.info(`Scraping text from ${source.name}`, { limit })
  const items = []

  // Simulate downloading from HF (in production: use @huggingface/hub to fetch actual data)
  for (let i = 0; i < Math.min(limit, 50); i++) {
    items.push({
      id:              uuid(),
      media_type:      'text',
      source_name:     source.name,
      hf_dataset_id:   source.hf_id,
      label:           source.label,
      confidence:      source.label === 'ai' ? 0.95 : 0.92,
      is_synthetic:    false,
      is_deduplicated: false,
      split:           ['train', 'train', 'train', 'val', 'test'][Math.floor(Math.random() * 5)] === 'test' ? 'test' : 
                       Math.random() < 0.1 ? 'val' : 'train',
      metadata: {
        char_count: 200 + Math.floor(Math.random() * 2000),
        language: 'en',
        scraped_at: new Date().toISOString(),
      },
    })
  }

  return items
}

export async function runScraper(job) {
  const { media_type, limit = 1000, target_label } = job.payload || {}
  const types = media_type ? [media_type] : ['text', 'image', 'audio']

  let downloaded = 0
  let failed     = 0

  for (const type of types) {
    const sources = SOURCES[type] || []
    const filtered = target_label ? sources.filter(s => s.label === target_label) : sources

    for (const source of filtered) {
      try {
        const batchLimit = Math.ceil(limit / filtered.length)
        const items = await scrapeTextSample(source, batchLimit)

        if (items.length > 0) {
          const { error } = await db.from('dataset_items').insert(items)
          if (error) { logger.error(`Insert error for ${source.name}`, { error: error.message }); failed += items.length; continue }

          // Update source stats
          await db.from('source_stats').upsert({
            source_name:    source.name,
            source_url:     `https://huggingface.co/datasets/${source.hf_id}`,
            media_type:     type,
            total_scraped:  items.length,
            accepted:       items.length,
            last_scraped_at: new Date().toISOString(),
          }, { onConflict: 'source_name' })

          downloaded += items.length
          logger.info(`Scraped ${items.length} items from ${source.name}`)
        }
      } catch (err) {
        logger.error(`Scrape failed for ${source.name}`, { error: err.message })
        failed++
      }
    }
  }

  return { downloaded, failed, total: downloaded + failed }
}
