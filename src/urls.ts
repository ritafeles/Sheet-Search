const trailing = /[.,;:!?、。）」』】》〉]+$/u;

export function extractUrls(text:string):string[] {
  const found=text.match(/https?:\/\/[^\s<>"'、。）」』】》〉]+/giu)||[];
  return [...new Set(found.map(value=>value.replace(trailing,'')).filter(Boolean))];
}
