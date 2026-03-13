import type { Source } from '../types'

export const IMAGE_SOURCES: Source[] = [
  { name: 'diffusiondb',    id: 'poloclub/diffusiondb',                              config: 'large_random_100k', media_type: 'image', label: 'ai',    image_field: 'image',         meta_fields: ['prompt','width','height','seed'] },
  { name: 'midjourney-v6',  id: 'terminusresearch/midjourney-v6-160k-raw',                                        media_type: 'image', label: 'ai',    url_field: 'url',             meta_fields: ['prompt','width','height'] },
  { name: 'civitai-images', id: 'joachimsallstrom/civitai-images',                                                media_type: 'image', label: 'ai',    url_field: 'url',             meta_fields: ['description','width','height'] },
  { name: 'cifake-ai',      id: 'jlbaker361/cifake-real-and-ai-generated-small-images',                           media_type: 'image', label: 'mixed', image_field: 'image',         label_field: 'label', label_map: { FAKE:'ai',REAL:'human',fake:'ai',real:'human' } },
  { name: 'deepfake-faces', id: 'marcelomoreno26/deepfake-detection',                                             media_type: 'image', label: 'mixed', image_field: 'image',         label_field: 'label', label_map: { '0':'human','1':'ai' } },
  { name: 'ai-art-laion',   id: 'fantasyfish/laion-art-subset',                                                   media_type: 'image', label: 'ai',    url_field: 'url',             meta_fields: ['TEXT','WIDTH','HEIGHT'] },
  { name: 'dalle3-coco',    id: 'shunk031/MSCOCO-2017-Captions-DALLE3',                                           media_type: 'image', label: 'ai',    url_field: 'url',             meta_fields: ['caption'] },
  { name: 'unsplash-25k',   id: 'jamescalam/unsplash-25k-photos',                                                 media_type: 'image', label: 'human', url_field: 'photo_image_url', meta_fields: ['photo_description','photo_width','photo_height'] },
  { name: 'flickr30k',      id: 'nlphuji/flickr30k',                                                              media_type: 'image', label: 'human', image_field: 'image',         meta_fields: ['caption'] },
  { name: 'div2k-real',     id: 'eugenesiow/Div2k',                                 config: 'bicubic_x2',        media_type: 'image', label: 'human', image_field: 'hr' },
  { name: 'celeba-hq',      id: 'CUHK-CSE/celebahq-faces',                                                       media_type: 'image', label: 'human', image_field: 'image' },
]
