import {highlightTerms, slackTextParts} from '@/lib/slackText';

export default function SlackText({text, names, query}: {text?: string | null; names?: Map<string, string>; query?: string}) {
    const parts = slackTextParts(text, names);
    return parts.map((part, index) => {
        const pieces = query ? highlightTerms(part.text, query) : [{text: part.text, match: false}];
        const body = pieces.map((piece, pieceIndex) => (
            piece.match ? <mark key={pieceIndex}>{piece.text}</mark> : <span key={pieceIndex}>{piece.text}</span>
        ));
        if (!part.href) {
            return <span key={index}>{body}</span>;
        }
        return (
            <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
                {body}
            </a>
        );
    });
}
