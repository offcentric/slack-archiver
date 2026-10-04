import Link from 'next/link';
import {Fragment, ReactNode} from 'react';
import {messagesByUserPath} from '@/lib/messages';
import {highlightTerms, parseSlackMessage, SlackNode} from '@/lib/slackText';

interface SlackTextProps {
    text?: string | null;
    names?: Map<string, string>;
    query?: string;
    workspace?: string;
    channel?: string | null;
}

export default function SlackText({text, names, query, workspace, channel}: SlackTextProps) {
    return renderNodes(parseSlackMessage(text, names), query, workspace, channel, 'm');
}

function renderNodes(nodes: SlackNode[], query: string | undefined, workspace: string | undefined, channel: string | null | undefined, keyPrefix: string): ReactNode[] {
    return nodes.map((node, index) => renderNode(node, query, workspace, channel, `${keyPrefix}-${index}`));
}

function renderNode(node: SlackNode, query: string | undefined, workspace: string | undefined, channel: string | null | undefined, key: string): ReactNode {
    const children = 'children' in node ? renderNodes(node.children, query, workspace, channel, key) : null;
    switch (node.type) {
        case 'text': {
            const pieces = query ? highlightTerms(node.text, query) : [{text: node.text, match: false}];
            return (
                <Fragment key={key}>
                    {pieces.map((piece, index) => (
                        piece.match ? <mark key={`${key}-${index}`}>{piece.text}</mark> : <span key={`${key}-${index}`}>{piece.text}</span>
                    ))}
                </Fragment>
            );
        }
        case 'bold':
            return <strong key={key}>{children}</strong>;
        case 'italic':
            return <em key={key}>{children}</em>;
        case 'strike':
            return <s key={key}>{children}</s>;
        case 'code':
            return <code key={key}>{children}</code>;
        case 'pre':
            return <pre key={key}><code>{node.text}</code></pre>;
        case 'paragraph':
            return <p key={key}>{children}</p>;
        case 'quote':
            return <blockquote key={key}>{children}</blockquote>;
        case 'heading':
            return <p key={key} className={`md-h md-h${node.level}`}>{children}</p>;
        case 'link':
            return <a key={key} href={node.href} target="_blank" rel="noopener noreferrer">{children}</a>;
        case 'mention':
            if (!workspace) {
                return <span key={key} className="mention">{node.text}</span>;
            }
            return (
                <Link key={key} className="mention" href={messagesByUserPath(workspace, node.id, channel)} title={`Messages by ${node.text}`}>
                    {node.text}
                </Link>
            );
        case 'list': {
            const items = node.items.map((item, index) => (
                <li key={`${key}-${index}`}>{renderNodes(item, query, workspace, channel, `${key}-${index}`)}</li>
            ));
            return node.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
        }
        default:
            return null;
    }
}
