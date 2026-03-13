import type { Source } from '../types'

export const VIDEO_SOURCES: Source[] = [
  { name: 'faceforensics',  id: 'OpenRL/FaceForensics',                                              media_type: 'video', label: 'ai',    url_field: 'video_url',  meta_fields: ['manipulation_type','compression'] },
  { name: 'dfdc-meta',      id: 'datasets/dfdc',                                                     media_type: 'video', label: 'ai',    url_field: 'url',        meta_fields: ['label','confidence','original'] },
  { name: 'celeb-df',       id: 'datasets/celeb_df',                                                 media_type: 'video', label: 'mixed', url_field: 'video_path', label_field: 'label', label_map: { '0':'human','1':'ai',fake:'ai',real:'human' } },
  { name: 'deepfake-timit', id: 'datasets/timit_asr',                                                media_type: 'video', label: 'ai',    url_field: 'file',       meta_fields: ['text'] },
  { name: 'kinetics-400',   id: 'HuggingFaceM4/kinetics',                           config: '400',   media_type: 'video', label: 'human', url_field: 'url',        meta_fields: ['label','start_time','end_time'] },
  { name: 'ucf101-subset',  id: 'Frikkie88/ucf101-subset',                                           media_type: 'video', label: 'human', url_field: 'video_url',  meta_fields: ['label','duration'] },
  { name: 'hmdb51',         id: 'datasets/hmdb',                                                     media_type: 'video', label: 'human', url_field: 'video_path', meta_fields: ['action_label'] },
  { name: 'xd-violence',    id: 'jherng/xd-violence',                                                media_type: 'video', label: 'human', url_field: 'id',         meta_fields: ['binary_label'] },
]
