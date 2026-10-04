export default function Spinner({label = 'Loading…'}: {label?: string}) {
    return (
        <p className="spinner" role="status" aria-live="polite">
            <span className="spinner-ring" aria-hidden="true"/>
            <span>{label}</span>
        </p>
    );
}
