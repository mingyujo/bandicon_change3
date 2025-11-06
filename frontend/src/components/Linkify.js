// [새 파일] src/components/Linkify.js
import React from 'react';

const Linkify = ({ children, style = {} }) => {
  // URL을 인식하는 정규식 (http, https, www 포함)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

  const linkifyText = (text) => {
    if (typeof text !== 'string') return text;

    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      // URL인지 확인
      if (urlRegex.test(part)) {
        // www로 시작하는 경우 http:// 추가
        const href = part.startsWith('www.') ? `http://${part}` : part;
        
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--primary-color)',
              textDecoration: 'underline',
              wordBreak: 'break-all', // 긴 URL이 깨지지 않게
              ...style
            }}
          >
            {part}
          </a>
        );
      }
      
      return part;
    });
  };

  // children이 문자열이면 링크화, 아니면 그대로 반환
  if (typeof children === 'string') {
    return <span style={{ whiteSpace: 'pre-wrap' }}>{linkifyText(children)}</span>;
  }

  return children;
};

export default Linkify;