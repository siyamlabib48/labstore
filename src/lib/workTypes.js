import { Instagram, FileText, PenTool, Globe, Boxes } from 'lucide-react';

export const WORK_TYPES = [
  {
    key: 'social_post',
    label: 'Social post',
    icon: Instagram,
    hint: 'Facebook, LinkedIn, Instagram or any other social media post',
    wantsLink: true,
    wantsImage: true,
    fileHint: 'Screenshot of the post (optional)',
  },
  {
    key: 'document',
    label: 'Word / Sheet',
    icon: FileText,
    hint: 'Word documents and spreadsheet files',
    wantsLink: false,
    wantsImage: false,
    fileHint: 'Upload your .docx / .xlsx file',
  },
  {
    key: 'illustrator',
    label: 'Illustrator',
    icon: PenTool,
    hint: 'Adobe Illustrator design files',
    wantsLink: false,
    wantsImage: false,
    fileHint: 'Upload your .ai / .eps file',
  },
  {
    key: 'wordpress',
    label: 'WordPress site',
    icon: Globe,
    hint: 'Live website — add a screenshot and the link',
    wantsLink: true,
    wantsImage: true,
    fileHint: 'Screenshot of the site (optional)',
  },
  {
    key: 'other',
    label: 'Other',
    icon: Boxes,
    hint: 'Anything else you created',
    wantsLink: false,
    wantsImage: false,
    fileHint: 'Upload any related file',
  },
];

export const workTypeOf = (key) => WORK_TYPES.find((type) => type.key === key) || WORK_TYPES[4];