
"use client"
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { Client } from './clients-manager';
import type { Account } from './accounts-manager';
import type { SavedSheetInfo } from '@/app/page';
import { formatNumber } from "@/lib/utils";
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils"
import { format, subDays } from "date-fns"
import { DateRange } from "react-day-picker";

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
  date: string;
};

const datePresets = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
];

export default function LedgerRecord({ clients, accounts, savedSheetLog, draws }: LedgerRecordProps) {
  const [selectedDraw, setSelectedDraw] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [selectedPreset, setSelectedPreset] = useState<string>("today");

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    const now = new Date();
    if (value === 'today') {
      setDateRange({ from: now, to: now });
    } else if (value === 'yesterday') {
      const yesterday = subDays(now, 1);
      setDateRange({ from: yesterday, to: yesterday });
    } else if (value === 'last7') {
      setDateRange({ from: subDays(now, 6), to: now });
    }
  }

  const reportData: ReportRow[] = useMemo(() => {
    const data: ReportRow[] = [];
    const drawsToProcess = selectedDraw === 'all' ? draws : [selectedDraw];
    
    drawsToProcess.forEach(drawName => {
      const drawLogs = savedSheetLog[drawName] || [];
      drawLogs.forEach(log => {
        const logDate = new Date(log.date);
        
        // Date filtering
        const from = dateRange?.from ? new Date(dateRange.from.setHours(0,0,0,0)) : null;
        const to = dateRange?.to ? new Date(dateRange.to.setHours(23,59,59,999)) : null;
        if ((from && logDate < from) || (to && logDate > to)) {
          return;
        }

        const client = clients.find(c => c.id === log.clientId);
        if (!client) return;
        
        const totalInvested = log.gameTotal || 0;
        const clientAccount = accounts.find(acc => acc.id === client.id);
        // This part needs to be improved if declared numbers are stored historically.
        // For now, we assume passing amount is not known for past dates.
        const passingAmount = clientAccount?.draws?.[drawName]?.passingAmount || 0; 
        const passingMultiplier = parseFloat(client.pair) || 80;
        const totalWon = passingAmount * passingMultiplier; // This might be inaccurate for historical data
        
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
          date: log.date
        });
      })
    });

    return data.sort((a, b) => b.profitOrLoss - a.profitOrLoss);
  }, [selectedDraw, dateRange, clients, accounts, savedSheetLog, draws]);
  
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
        <CardDescription>Analyze client investment and profit/loss by draw and date.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-6 p-4 border rounded-lg bg-muted/50">
          <div className="flex-1 min-w-[180px]">
            <Select value={selectedDraw} onValueChange={setSelectedDraw}>
              <SelectTrigger>
                <SelectValue placeholder="Select Draw" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Draws</SelectItem>
                {draws.map(draw => (
                  <SelectItem key={draw} value={draw}>{draw}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="flex-1 min-w-[180px]">
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Date Range" />
              </SelectTrigger>
              <SelectContent>
                {datePresets.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                ))}
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedPreset === 'custom' && (
            <div className="flex-1 min-w-[280px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Draw Name</TableHead>
                <TableHead>Date</TableHead>
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
                  <TableCell>{format(new Date(row.date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">₹{formatNumber(row.totalInvested)}</TableCell>
                  <TableCell className={`text-right font-bold ${row.profitOrLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {row.profitOrLoss >= 0 ? `+₹${formatNumber(row.profitOrLoss)}` : `-₹${formatNumber(Math.abs(row.profitOrLoss))}`}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No records found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
             <TableFooter>
              <TableRow className="bg-muted/50 hover:bg-muted">
                <TableCell colSpan={4} className="font-bold text-lg">Overall Performance</TableCell>
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
