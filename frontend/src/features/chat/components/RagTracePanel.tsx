import { useMemo, useState } from 'react';
import {
    ChevronDown,
    FileText,
    ListTree,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import styles from './RagTracePanel.module.css';
import type { RagTrace, SourceAttachment } from '../../../store/types';

interface RagTracePanelProps {
    trace: RagTrace;
    onSelectSource: (source: SourceAttachment) => void;
}

const formatScore = (value?: number | null) => {
    if (value === null || value === undefined) return '—';
    return value.toFixed(2);
};

const toSourceAttachment = (reference: SourceAttachment): SourceAttachment => ({
    ...reference,
    title: reference.title ?? reference.documentTitle,
});

const mapDiscardReason = (reason?: string) => {
    if (!reason) return '未命中相关资料';
    switch (reason) {
        case 'low_confidence':
            return '检索到的相似度过低，已忽略';
        case 'no_candidates':
            return '未检索到候选资料';
        case 'retrieval_not_required':
            return '模型判断无需查询知识库';
        default:
            return reason;
    }
};

export function RagTracePanel({ trace, onSelectSource }: RagTracePanelProps) {
    const [expanded, setExpanded] = useState(false);
    const references = trace.references ?? [];
    const hasCandidates = trace.candidates.length > 0;

    const decisionState = useMemo(() => {
        const reason = trace.decisionReason;
        if (trace.decision === 'skip' || trace.knowledgeBaseUsed === false) {
            return {
                label: '已跳过知识库',
                variant: 'skipped' as const,
                reason: reason || '模型判断无需查询知识库',
            };
        }
        if (trace.knowledgeBaseUsed) {
            return {
                label: '已使用知识库',
                variant: 'used' as const,
                reason,
            };
        }
        if (trace.decision === 'retrieve') {
            return {
                label: '准备检索知识库',
                variant: 'pending' as const,
                reason,
            };
        }
        if (trace.decisionStatus === 'evaluating') {
            return {
                label: '正在判断是否需要知识库',
                variant: 'pending' as const,
                reason,
            };
        }
        return {
            label: '等待知识库决策',
            variant: 'pending' as const,
            reason,
        };
    }, [trace.decision, trace.decisionReason, trace.decisionStatus, trace.knowledgeBaseUsed]);

    const ragActive = decisionState.variant === 'used';

    const summary = useMemo(() => {
        return [
            { label: '策略', value: ragActive ? trace.strategy ?? 'chunk_neighbors' : '—' },
            { label: 'TopK', value: ragActive ? trace.topK ?? 4 : '—' },
            { label: '重排', value: ragActive ? (trace.rerank === false ? '关闭' : '开启') : '—' },
            { label: '模型', value: trace.model ?? '默认' },
        ];
    }, [ragActive, trace.model, trace.rerank, trace.strategy, trace.topK]);

    return (
        <div className={styles.trace}>
            <button
                type="button"
                className={styles.toggle}
                onClick={() => setExpanded(!expanded)}
            >
                <Sparkles size={16} />
                <span>RAG 过程</span>
                <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
                />
            </button>

            {expanded && (
                <div className={styles.body}>
                    <div className={styles.decision}>
                        <div className={styles.decisionHeader}>
                            <ShieldCheck size={14} />
                            <span>知识库决策</span>
                        </div>
                        <p
                            className={`${styles.decisionStatus} ${
                                decisionState.variant === 'used'
                                    ? styles.decisionStatusUsed
                                    : decisionState.variant === 'skipped'
                                        ? styles.decisionStatusSkipped
                                        : styles.decisionStatusPending
                            }`}
                        >
                            {decisionState.label}
                        </p>
                        {decisionState.reason && (
                            <p className={styles.decisionReason}>{decisionState.reason}</p>
                        )}
                    </div>

                    <div className={styles.meta}>
                        {summary.map((item) => (
                            <div key={item.label}>
                                <p className={styles.metaLabel}>{item.label}</p>
                                <p className={styles.metaValue}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    {hasCandidates && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <ListTree size={14} />
                                <span>检索候选（{trace.candidates.length}）</span>
                            </div>
                            <div className={styles.candidateList}>
                                {trace.candidates.map((candidate) => (
                                    <button
                                        key={candidate.referenceId ?? candidate.internalId}
                                        type="button"
                                        className={styles.candidateCard}
                                        onClick={() =>
                                            onSelectSource(
                                                toSourceAttachment(candidate),
                                            )
                                        }
                                    >
                                        <p className={styles.candidateTitle}>
                                            {candidate.documentTitle}
                                        </p>
                                        <p className={styles.candidateSnippet}>
                                            {candidate.snippet}
                                        </p>
                                        <div className={styles.candidateScores}>
                                            <span>相似度 {formatScore(candidate.similarityScore)}</span>
                                            <span>重排 {formatScore(candidate.rerankScore)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {references.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <FileText size={14} />
                                <span>已引用资料（{references.length}）</span>
                            </div>
                            <div className={styles.referenceList}>
                                {references.map((reference, idx) => (
                                    <button
                                        key={reference.referenceId ?? `reference-${idx}`}
                                        type="button"
                                        className={styles.referenceCard}
                                        onClick={() =>
                                            onSelectSource(
                                                toSourceAttachment(reference),
                                            )
                                        }
                                    >
                                        <p className={styles.referenceTitle}>
                                            {reference.documentTitle}
                                        </p>
                                        <p className={styles.referenceSnippet}>
                                            {reference.snippet}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {references.length === 0 && trace.discardedReason && (
                        <div className={styles.emptyState}>
                            <p className={styles.emptyTitle}>
                                {ragActive ? '未引用知识库资料' : '本轮未使用知识库'}
                            </p>
                            <p className={styles.emptyReason}>
                                {mapDiscardReason(trace.discardedReason)}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
