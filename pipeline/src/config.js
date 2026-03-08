import 'dotenv/config'

export const config = {
  supabaseUrl:     process.env.SUPABASE_URL,
  supabaseKey:     process.env.SUPABASE_SERVICE_KEY,
  hfToken:         process.env.HF_TOKEN,
  hfDatasetRepo:   process.env.HF_DATASET_REPO,
  hfModelRepo:     process.env.HF_MODEL_REPO,
  dataDir:         process.env.DATA_DIR || './data',
  chunkSize:       parseInt(process.env.DATA_CHUNK_SIZE || '10000'),
  adminEmail:      process.env.ADMIN_EMAIL,
  metricsWebhook:  process.env.MODEL_METRICS_WEBHOOK,
}

export const MEDIA_TYPES = ['image', 'audio', 'text', 'video']
export const LABELS      = ['ai', 'human']
export const SPLITS      = ['train', 'val', 'test']
export const SPLIT_RATIOS = { train: 0.8, val: 0.1, test: 0.1 }
