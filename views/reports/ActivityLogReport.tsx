import React from 'react';
import { LogEntry } from '../../types';

interface ActivityLogReportProps {
    log: LogEntry[];
}

const ActivityLogReport: React.FC<ActivityLogReportProps> = ({ log }) => {
    return (
        <div>
            <div className="report-header"><h1>ประวัติการทำงาน</h1></div>
            <table className="report-table">
                <thead><tr><th>เวลา</th><th>การดำเนินการ</th></tr></thead>
                <tbody>
                    {log.map((entry, index) => (
                        <tr key={index}>
                            <td>{new Date(entry.timestamp).toLocaleString('th-TH')}</td>
                            <td>{entry.action}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
};

export default ActivityLogReport;
