import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Home, ChevronRight } from 'lucide-react';
import '../styles/whitepaper.css';

export const WhitepaperPage: React.FC = () => {
  const [whitepaperContent, setWhitepaperContent] = useState('');
  const [activeSection, setActiveSection] = useState('');

  // Table of Contents structure
  const tableOfContents = [
    { id: 'abstract', title: 'Abstract' },
    { id: '1-executive-summary', title: '1. Executive Summary' },
    { id: '2-introduction', title: '2. Introduction' },
    { id: '3-problem-statement', title: '3. Problem Statement' },
    { id: '4-solution-agarcrypto', title: '4. Solution: AgarCrypto' },
    { id: '5-technical-architecture', title: '5. Technical Architecture' },
    { id: '6-smart-contract-design', title: '6. Smart Contract Design' },
    { id: '7-game-mechanics', title: '7. Game Mechanics' },
    { id: '8-cryptographic-verification', title: '8. Cryptographic Verification' },
    { id: '9-user-experience-flow', title: '9. User Experience Flow' },
    { id: '10-business-model--economics', title: '10. Business Model & Economics' },
    { id: '11-market-analysis', title: '11. Market Analysis' },
    { id: '12-roadmap', title: '12. Roadmap' },
    { id: '13-security--compliance', title: '13. Security & Compliance' },
    { id: '14-token-economics', title: '14. Token Economics' },
    { id: '15-conclusion', title: '15. Conclusion' },
    { id: '16-appendix', title: '16. Appendix' }
  ];

  // Load whitepaper content
  useEffect(() => {
    fetch('/WHITEPAPER.md')
      .then((response) => response.text())
      .then((text) => setWhitepaperContent(text))
      .catch((error) => console.error('Error loading whitepaper:', error));
  }, []);

  // Handle scroll to update active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;

      // Update active section
      for (const section of tableOfContents) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, [whitepaperContent]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

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
        {/* Table of Contents Sidebar */}
        <aside className="whitepaper-toc">
          <div className="toc-header">
            <h3>Contents</h3>
          </div>

          <nav>
            <ul>
              {tableOfContents.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={activeSection === section.id ? 'active' : ''}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(section.id);
                    }}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <main className="whitepaper-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              // Map headers to sections with IDs
              h1: ({ node, children, ...props }) => {
                const text = String(children);
                let id = '';

                // Generate IDs based on section numbers
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

                return (
                  <section id={id}>
                    <h1 {...props}>{children}</h1>
                  </section>
                );
              },
              h2: ({ node, children, ...props }) => {
                const text = String(children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                return <h2 id={text} {...props}>{children}</h2>;
              },
              h3: ({ node, children, ...props }) => {
                const text = String(children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                return <h3 id={text} {...props}>{children}</h3>;
              },
              // Style code blocks
              code: ({ node, inline, className, children, ...props }) => {
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
