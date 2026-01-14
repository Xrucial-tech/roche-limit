import React from 'react';

interface Props {
  report: string[] | null;
  onClose: () => void;
}

const styles = {
  overlay: {
    position: 'absolute' as 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  modal: {
    backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px',
    padding: '24px', width: '400px', maxWidth: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
  },
  header: { color: '#facc15', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '8px' },
  list: { maxHeight: '300px', overflowY: 'auto' as 'auto', marginBottom: '20px' },
  item: { fontSize: '12px', color: '#cbd5e1', padding: '4px 0', borderBottom: '1px solid #1e293b' },
  btn: {
    width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none',
    borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'
  }
};

export const TurnResults: React.FC<Props> = ({ report, onClose }) => {
  if (!report) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>TURN REPORT</div>
        <div style={styles.list}>
            {report.length === 0 ? (
                <div style={{ color: '#64748b', fontStyle: 'italic' }}>No significant events recorded.</div>
            ) : (
                report.map((line, i) => (
                    <div key={i} style={styles.item}>• {line}</div>
                ))
            )}
        </div>
        <button onClick={onClose} style={styles.btn}>ACKNOWLEDGE</button>
      </div>
    </div>
  );
};