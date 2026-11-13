"use client";
import React from "react";
import Bone from "./Bone";

export interface TableSkeletonProps {
  rows?: number;
  widths: string[];
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, widths }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`skel-row-${rIdx}`}>
          {widths.map((w, cIdx) => (
            <td key={`skel-cell-${rIdx}-${cIdx}`}>
              <Bone className={w} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default TableSkeleton;
