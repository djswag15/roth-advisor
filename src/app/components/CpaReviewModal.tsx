'use client'

import { Analysis } from '@/app/lib/engine'
import { useState } from 'react'

interface CpaReviewModalProps {
  analysis: Analysis
  onDismiss: () => void
}

export default function CpaReviewModal({ analysis, onDismiss }: CpaReviewModalProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !analysis.requiresCpaReview) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⚠️</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">CPA Review Recommended</h2>
                <p className="text-sm text-gray-600 mt-1">Your situation has important tax considerations</p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {analysis.complianceWarnings && analysis.complianceWarnings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Important Warnings</h3>
              <div className="space-y-2">
                {analysis.complianceWarnings.map((warning, idx) => (
                  <div key={idx} className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-800">
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.irmaaDetail && analysis.irmaaDetail.totalAnnualSurcharge > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Medicare Impact</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Annual IRMAA Surcharge:</span>
                  <span className="font-semibold text-red-600">
                    ${analysis.irmaaDetail.totalAnnualSurcharge.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {analysis.complianceRecommendations && analysis.complianceRecommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">CPA Discussion Points</h3>
              <div className="space-y-2">
                {analysis.complianceRecommendations.map((rec, idx) => (
                  <div key={idx} className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-sm text-blue-900">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs text-yellow-900">
            <strong>Disclaimer:</strong> This analysis is educational only. Before making conversion decisions, consult
            with a qualified tax professional who understands your full financial situation.
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex gap-3 justify-end">
          <button
            onClick={() => setDismissed(true)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            I will Consult a CPA
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
