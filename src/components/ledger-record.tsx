
"use client"
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import type { Client } from './clients-manager';
import type { Account } from './accounts-manager';
import type { SavedSheetInfo } from '@/app/page';
import { formatNumber } from "@/lib/utils";

type LedgerRecordProps = {
  clients: Client[];
  accounts: Account[];
  savedSheetLog: { [draw: string]: SavedSheetInfo[] };
  draws: string[];
};

type ReportRow = {
  clientName: string;
  drawName: string;
  totalInvested: number;
  totalWon: number;
  profitOrLoss: number;
};

export default function LedgerRecord({ clients, accounts, savedSheetLog, draws }: LedgerRecordProps) {
  const reportData: ReportRow[] = useMemo(() => {
    const data: ReportRow[] = [];

    clients.forEach(client => {
      draws.forEach(drawName => {
        const clientLog = savedSheetLog[drawName]?.find(log => log.clientId === client.id);
        const totalInvested = clientLog?.gameTotal || 0;

        if (totalInvested > 0) { // Only show rows with activity
          const clientAccount = accounts.find(acc => acc.id === client.id);
          const passingAmount = clientAccount?.draws?.[drawName]?.passingAmount || 0;
          const passingMultiplier = parseFloat(client.pair) || 80;
          const totalWon = passingAmount * passingMultiplier;
          
          const clientCommissionPercent = parseFloat(client.comm) / 100;
          const commission = totalInvested * clientCommissionPercent;
          const netInvestment = totalInvested - commission;

          const profitOrLoss = totalWon - netInvestment;
          
          data.push({
            clientName: client.name,
            drawName,
            totalInvested: netInvestment,
            totalWon,
            profitOrLoss,
          });
        }
      });
    });

    // Sort by profitOrLoss in descending order
    return data.sort((a, b) => b.profitOrLoss - a.profitOrLoss);
  }, [clients, accounts, savedSheetLog, draws]);
  
  const { totalInvested, totalProfitOrLoss } = useMemo(() => {
    return reportData.reduce(
      (acc, row) => {
        acc.totalInvested += row.totalInvested;
        acc.totalProfitOrLoss += row.profitOrLoss;
        return acc;
      },
      { totalInvested: 0, totalProfitOrLoss: 0 }
    );
  }, [reportData]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Performance Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Draw Name</TableHead>
                <TableHead className="text-right">Net Invested</TableHead>
                <TableHead className="text-right">Profit/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? reportData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{row.clientName}</TableCell>
                  <TableCell>{row.drawName}</TableCell>
                  <TableCell className="text-right">₹{formatNumber(row.totalInvested)}</TableCell>
                  <TableCell className={`text-right font-bold ${row.profitOrLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {row.profitOrLoss >= 0 ? `+₹${formatNumber(row.profitOrLoss)}` : `-₹${formatNumber(Math.abs(row.profitOrLoss))}`}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
             <TableFooter>
              <TableRow className="bg-muted/50 hover:bg-muted">
                <TableCell colSpan={3} className="font-bold text-lg">Overall Performance</TableCell>
                <TableCell className="text-right font-bold text-lg">₹{formatNumber(totalInvested)}</TableCell>
                <TableCell className={`text-right font-bold text-lg ${totalProfitOrLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalProfitOrLoss >= 0 ? `+₹${formatNumber(totalProfitOrLoss)}` : `-₹${formatNumber(Math.abs(totalProfitOrLoss))}`}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
