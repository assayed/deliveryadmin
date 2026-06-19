export default function StatusBadge({ status }) {
  const cls = {
    'Unassigned': 'badge-gray',
    'Assigned': 'badge-info',
    'Picked Up': 'badge-warning',
    'Delivered': 'badge-success',
    'Failed': 'badge-danger',
  }[status] || 'badge-gray';
  return <span className={`badge ${cls}`}>{status}</span>;
}
