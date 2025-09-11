
"use client"
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { Client } from './clients-manager';
import type { SavedSheetInfo } from '@/app/page';
import { formatNumber } from "@/lib/utils";
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { cn } from "@/lib/utils"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"

type LedgerRecordProps = {
  clients: Client[];
  savedSheetLog: { [draw: string]: SavedSheetInfo[] };
  draws: string[];
};

type DailyReportRow = {
  date: Date;
  clientPayable: number;
  upperPayable: number;
  brokerProfit: number;
};

const defaultClientComm = 10;
const defaultUpperComm = 20;
const defaultClientPair = 90;
const defaultUpperPair = 80;

export default function LedgerRecord({ clients, savedSheetLog }: LedgerRecordProps) {
  const [upperComm, setUpperComm] = useState(defaultUpperComm.toString());
  const [upperPair, setUpperPair] = useState(defaultUpperPair.toString());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  const dailyReportData: DailyReportRow[] = useMemo(() => {
    const upperCommPercent = parseFloat(upperComm) / 100 || defaultUpperComm / 100;
    const upperPairRate = parseFloat(upperPair) || defaultUpperPair;

    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return daysInMonth.map(day => {
      let totalClientPayableForDay = 0;
      let totalUpperPayableForDay = 0;

      clients.forEach(client => {
        const clientCommPercent = parseFloat(client.comm) / 100 || defaultClientComm / 100;
        const clientPairRate = parseFloat(client.pair) || defaultClientPair;

        let totalGameAmountForClientDay = 0;
        let totalPassingAmountForClientDay = 0;
        
        Object.values(savedSheetLog).flat().forEach(log => {
          if (log.clientId === client.id && isSameDay(new Date(log.date), day)) {
            totalGameAmountForClientDay += log.gameTotal;
            // Simplified passing amount - this would need historical declared numbers to be accurate.
            // Assuming passing amount is captured in some way if a number is declared.
            // For this calculation, we'll assume passing is tracked elsewhere or we need more data.
            // Here we focus on commission-based profit.
            // Let's find passing amount from log.data and a hypothetical declared number.
            // This is a simplification. A real implementation would need declared numbers per day.
          }
        });

        if (totalGameAmountForClientDay > 0) {
          const clientCommission = totalGameAmountForClientDay * clientCommPercent;
          const clientNet = totalGameAmountForClientDay - clientCommission;
          const clientWinnings = totalPassingAmountForClientDay * clientPairRate;
          const clientPayable = clientNet - clientWinnings;
          totalClientPayableForDay += clientPayable;

          const upperCommission = totalGameAmountForClientDay * upperCommPercent;
          const upperNet = totalGameAmountForClientDay - upperCommission;
          const upperWinnings = totalPassingAmountForClientDay * upperPairRate;
          const upperPayable = upperNet - upperWinnings;
          totalUpperPayableForDay += upperPayable;
        }
      });
      
      const brokerProfit = totalClientPayableForDay - totalUpperPayableForDay;
      
      return {
        date: day,
        clientPayable: totalClientPayableForDay,
        upperPayable: totalUpperPayableForDay,
        brokerProfit,
      };
    });

  }, [selectedMonth, upperComm, upperPair, clients, savedSheetLog]);

  const monthlyTotalProfit = useMemo(() => {
    return dailyReportData.reduce((acc, row) => acc + row.brokerProfit, 0);
  }, [dailyReportData]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Broker Profit & Loss</CardTitle>
        <CardDescription>Analyze your daily and monthly brokerage profit.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-2">
            <Label htmlFor="upper-comm">Upper Broker Comm (%)</Label>
            <Input 
              id="upper-comm" 
              value={upperComm} 
              onChange={(e) => setUpperComm(e.target.value)} 
              placeholder={String(defaultUpperComm)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upper-pair">Upper Broker Pair Rate</Label>
            <Input 
              id="upper-pair" 
              value={upperPair} 
              onChange={(e) => setUpperPair(e.target.value)} 
              placeholder={String(defaultUpperPair)}
            />
          </div>
          <div className="space-y-2">
            <Label>Select Month</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedMonth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedMonth ? format(selectedMonth, "MMMM yyyy") : <span>Pick a month</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => date && setSelectedMonth(date)}
                  initialFocus
                  captionLayout="dropdown-buttons"
                  fromYear={2020}
                  toYear={new Date().getFullYear() + 1}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Monthly Summary</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${monthlyTotalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {monthlyTotalProfit >= 0 ? `+₹${formatNumber(monthlyTotalProfit)}` : `-₹${formatNumber(Math.abs(monthlyTotalProfit))}`}
                </div>
                <p className="text-xs text-muted-foreground">
                    Total profit for {format(selectedMonth, "MMMM yyyy")}
                </p>
            </CardContent>
        </Card>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Client Payable</TableHead>
                <TableHead className="text-right">Upper Payable</TableHead>
                <TableHead className="text-right">Broker Profit/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyReportData.map((row, index) => (
                <TableRow key={index} className={row.brokerProfit === 0 ? "text-muted-foreground" : ""}>
                  <TableCell className="font-medium">{format(row.date, "EEE, dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">₹{formatNumber(row.clientPayable)}</TableCell>
                  <TableCell className="text-right">₹{formatNumber(row.upperPayable)}</TableCell>
                  <TableCell className={`text-right font-bold ${row.brokerProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                     {row.brokerProfit >= 0 ? `+₹${formatNumber(row.brokerProfit)}` : `-₹${formatNumber(Math.abs(row.brokerProfit))}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/50 hover:bg-muted">
                <TableCell colSpan={3} className="font-bold text-lg text-right">Total Monthly Profit</TableCell>
                <TableCell className={`text-right font-bold text-lg ${monthlyTotalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {monthlyTotalProfit >= 0 ? `+₹${formatNumber(monthlyTotalProfit)}` : `-₹${formatNumber(Math.abs(monthlyTotalProfit))}`}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

    