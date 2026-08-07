'use client';

import { useActionState } from 'react';
import { bulkUploadSpas, type BulkUploadResult } from './actions';

const initialState: BulkUploadResult = { error: null };

export function BulkUploadForm() {
  const [state, formAction, isPending] = useActionState(bulkUploadSpas, initialState);

  return (
    <div className="space-y-4">
      <form action={formAction} className="card space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm text-foreground-secondary">CSV file</span>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="input-field"
          />
        </label>
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      {state.summary ? (
        <div className="card space-y-3">
          <h2 className="font-medium text-foreground">Result</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-foreground-secondary">
              {state.summary.totalRows} row{state.summary.totalRows === 1 ? '' : 's'}
            </span>
            <span className="text-brand-accent">{state.summary.created} created</span>
            {state.summary.failed > 0 ? (
              <span className="text-danger">{state.summary.failed} failed</span>
            ) : null}
          </div>

          {state.rowErrors && state.rowErrors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-left text-foreground-secondary">
                    <th className="py-1.5 pr-4">Row</th>
                    <th className="py-1.5 pr-4">Business</th>
                    <th className="py-1.5">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {state.rowErrors.map((rowError) => (
                    <tr key={rowError.row} className="border-t border-white/5">
                      <td className="py-1.5 pr-4 text-foreground">{rowError.row}</td>
                      <td className="py-1.5 pr-4 text-foreground-secondary">
                        {rowError.businessName}
                      </td>
                      <td className="py-1.5 text-danger">{rowError.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
