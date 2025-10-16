import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Home, ChevronRight } from 'lucide-react';
import '../styles/whitepaper.css';

export const WhitepaperPage: React.FC = () => {
  const [whitepaperContent, setWhitepaperContent] = useState('');

  // Load whitepaper content
  useEffect(() => {
    fetch('/WHITEPAPER.md')
      .then((response) => response.text())
      .then((text) => setWhitepaperContent(text))
      .catch((error) => console.error('Error loading whitepaper:', error));
  }, []);

  return (
    <div className="whitepaper-page">
      {/* Header */}
      <header className="whitepaper-header">
        <div className="whitepaper-header-content">
          {/* Breadcrumb */}
          <div className="whitepaper-breadcrumb">
            <a href="/">
              <Home size={16} />
            </a>
            <ChevronRight size={16} />
            <span>Whitepaper</span>
          </div>

          {/* Title Section */}
          <div className="whitepaper-title-section">
            <h1 className="whitepaper-title">AgarCrypto: Decentralized Wagering Infrastructure for Competitive Gaming</h1>
            <div className="whitepaper-meta">
              <span>Version 1.0</span>
              <span className="meta-divider">•</span>
              <span>January 2025</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="whitepaper-layout">
        {/* Content */}
        <main className="whitepaper-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              // Map headers to sections with IDs
              h1: ({ node, children, ...props }) => {
                return <h1 {...props}>{children}</h1>;
              },
              h2: ({ node, children, ...props }) => {
                const text = String(children);
                let id = '';

                // Generate IDs based on section numbers (H2 is the main section level)
                if (text.includes('Abstract')) id = 'abstract';
                else if (text.includes('1.')) id = '1-executive-summary';
                else if (text.includes('2.')) id = '2-introduction';
                else if (text.includes('3.')) id = '3-problem-statement';
                else if (text.includes('4.')) id = '4-solution-agarcrypto';
                else if (text.includes('5.')) id = '5-technical-architecture';
                else if (text.includes('6.')) id = '6-smart-contract-design';
                else if (text.includes('7.')) id = '7-game-mechanics';
                else if (text.includes('8.')) id = '8-cryptographic-verification';
                else if (text.includes('9.')) id = '9-user-experience-flow';
                else if (text.includes('10.')) id = '10-business-model--economics';
                else if (text.includes('11.')) id = '11-market-analysis';
                else if (text.includes('12.')) id = '12-roadmap';
                else if (text.includes('13.')) id = '13-security--compliance';
                else if (text.includes('14.')) id = '14-token-economics';
                else if (text.includes('15.')) id = '15-conclusion';
                else if (text.includes('16.')) id = '16-appendix';

                return <h2 id={id} {...props}>{children}</h2>;
              },
              h3: ({ node, children, ...props }) => {
                const text = String(children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                return <h3 id={text} {...props}>{children}</h3>;
              },
              // Style code blocks
              code: ({ inline, className, children, ...props }: any) => {
                return inline ? (
                  <code className={className} {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              // Open external links in new tab
              a: ({ node, children, href, ...props }) => {
                const isExternal = href && (href.startsWith('http') || href.startsWith('https'));
                return (
                  <a
                    href={href}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    {...props}
                  >
                    {children}
                  </a>
                );
              }
            }}
          >
            {whitepaperContent}
          </ReactMarkdown>
        </main>
      </div>
    </div>
  );
};
