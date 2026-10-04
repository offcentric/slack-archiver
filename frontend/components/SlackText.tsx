import Link from 'next/link';
import {messagesByUserPath} from '@/lib/messages';
import {highlightTerms, slackTextParts} from '@/lib/slackText';

interface SlackTextProps {
    text?: string | null;
    names?: Map<string, string>;
    query?: string;
    workspace?: string;
    channel?: string | null;
}

export default function SlackText({text, names, query, workspace, channel}: SlackTextProps) {
    const parts = slackTextParts(text, names);
    return parts.map((part, index) => {
        const pieces = query ? highlightTerms(part.text, query) : [{text: part.text, match: false}];
        const body = pieces.map((piece, pieceIndex) => (
            piece.match ? <mark key={pieceIndex}>{piece.text}</mark> : <span key={pieceIndex}>{piece.text}</span>
        ));
        if (part.mention && workspace) {
            return (
                <Link key={index} className="mention" href={messagesByUserPath(workspace, part.mention, channel)} title={`Messages by ${part.text}`}>
                    {body}
                </Link>
            );
        }
        if (!part.href) {
            return <span key={index} className={part.mention ? 'mention' : undefined}>{body}</span>;
        }
        return (
            <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
                {body}
            </a>
        );
    });
}
