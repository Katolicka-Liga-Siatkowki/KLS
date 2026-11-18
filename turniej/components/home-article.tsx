import type {ReactNode} from 'react';
import {safeArticleLink} from '@/lib/home-content';

function inline(text:string,depth=0):ReactNode{
 if(depth>4)return text;
 const pattern=/(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^\s)]+)\))/g;
 const nodes:ReactNode[]=[];let last=0;let match:RegExpExecArray|null;
 while((match=pattern.exec(text))){
  nodes.push(text.slice(last,match.index));
  if(match[2])nodes.push(<strong key={match.index}>{inline(match[2],depth+1)}</strong>);
  else{const href=safeArticleLink(match[4]);const social=href?.includes('facebook.com/')?'facebook':href?.includes('instagram.com/')?'instagram':null;
   nodes.push(href?<a key={match.index} href={href} target={href.startsWith('http')?'_blank':undefined} rel={href.startsWith('http')?'noopener noreferrer':undefined} className={social?'article-social-link':undefined}>{social&&<span className={'social-icon '+social+'-icon'} aria-hidden="true">{social==='facebook'?'f':<svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>}</span>}{inline(match[3],depth+1)}</a>:match[3]);
  }
  last=pattern.lastIndex;
 }
 nodes.push(text.slice(last));return nodes;
}

export default function HomeArticle({content}:{content:string}){
 const lines=content.replace(/\r\n?/g,'\n').split('\n'),blocks:ReactNode[]=[];
 for(let i=0;i<lines.length;){
  const line=lines[i].trim();if(!line){i++;continue}
  const heading=/^(#{1,3})\s+(.+)$/.exec(line);
  if(heading){const level=heading[1].length;blocks.push(level===1?<h2 key={i}>{inline(heading[2])}</h2>:level===2?<h3 key={i}>{inline(heading[2])}</h3>:<h4 key={i}>{inline(heading[2])}</h4>);i++;continue}
  if(/^[-*]\s+/.test(line)){const start=i,items:ReactNode[]=[];while(i<lines.length&&/^[-*]\s+/.test(lines[i].trim())){items.push(<li key={i}>{inline(lines[i].trim().replace(/^[-*]\s+/,''))}</li>);i++}blocks.push(<ul className="home-donation-list" key={start}>{items}</ul>);continue}
  const start=i,paragraph:string[]=[];while(i<lines.length&&lines[i].trim()&&!/^(#{1,3}\s+|[-*]\s+)/.test(lines[i].trim()))paragraph.push(lines[i++]);
  blocks.push(<p key={start}>{inline(paragraph.join('\n'))}</p>);
 }
 return <div className="home-article">{blocks}</div>;
}
