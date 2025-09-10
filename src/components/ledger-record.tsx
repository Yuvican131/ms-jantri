
"use client"
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { Client } from './clients-manager';
import type { Account } from './accounts-manager';
import type { SavedSheetInfo } from '@/app/page';
import { cn, formatNumber } from "@/lib/utils";

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
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedDraw, setSelectedDraw] = useState<string>("all");
  const [date, setDate] = useState<Date | undefined>(undefined);

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
          const profitOrLoss = totalWon - totalInvested;
          
          data.push({
            clientName: client.name,
            drawName,
            totalInvested,
            totalWon,
            profitOrLoss,
          });
        }
      });
    });

    return data;
  }, [clients, accounts, savedSheetLog, draws]);

  const filteredData = useMemo(() => {
    return reportData.filter(row => {
      const clientMatch = selectedClient === 'all' || row.clientName === selectedClient;
      const drawMatch = selectedDraw === 'all' || row.drawName === selectedDraw;
      // Date filtering logic will be added here
      return clientMatch && drawMatch;
    });
  }, [reportData, selectedClient, selectedDraw]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Performance Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex-1 min-w-[150px]">
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px]">
             <Select value={selectedDraw} onValueChange={setSelectedDraw}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Draw" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Draws</SelectItem>
                {draws.map(draw => (
                  <SelectItem key={draw} value={draw}>{draw}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="flex-1 min-w-[150px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Filter by Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
           </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Draw Name</TableHead>
                <TableHead className="text-right">Total Invested</TableHead>
                <TableHead className="text-right">Profit/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? filteredData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.clientName}</TableCell>
                  <TableCell>{row.drawName}</TableCell>
                  <TableCell className="text-right">₹{formatNumber(row.totalInvested)}</TableCell>
                  <TableCell className={`text-right font-bold ${row.profitOrLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {row.profitOrLoss >= 0 ? `+₹${formatNumber(row.profitOrLoss)}` : `-₹${formatNumber(Math.abs(row.profitOrLoss))}`}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No records found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
