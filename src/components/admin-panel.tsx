
"use client"
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, HandCoins, Landmark, CircleDollarSign, Trophy } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import type { Account } from "./accounts-manager";

const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];

const BrokerDrawSummaryCard = ({ 
    title, 
    rawTotal, 
    passingTotal 
}: { 
    title: string; 
    rawTotal: number; 
    passingTotal: number; 
}) => {
    return (
        <Card className="flex flex-col bg-muted/30">
            <div className="p-3 flex-grow">
                <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm text-foreground">{title}</h4>
                    <HandCoins className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-right text-foreground">{formatNumber(rawTotal)}</p>
            </div>
            <div className="p-2 bg-muted/50 border-t flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Passing</span>
                <span className="text-sm font-bold">{formatNumber(passingTotal)}</span>
            </div>
        </Card>
    );
};

const GrandTotalSummaryCard = ({ 
    title, 
    finalValue,
    grandRawTotal,
    grandPassingTotal
}: { 
    title: string; 
    finalValue: number;
    grandRawTotal: number;
    grandPassingTotal: number;
}) => {
    const valueColor = finalValue >= 0 ? 'text-green-400' : 'text-red-500';
    return (
        <Card className="flex flex-col justify-center p-3 bg-primary/10 border-primary/50 col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-1">
             <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm text-primary">{title}</h4>
                <Landmark className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2 text-right">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><CircleDollarSign className="h-3 w-3"/> Total Raw</span>
                    <span className="font-semibold">{formatNumber(grandRawTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                     <span className="text-xs text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3"/> Total Passing</span>
                     <span className="font-semibold">{formatNumber(grandPassingTotal)}</span>
                </div>
                <Separator className="my-1 bg-border/50" />
                <div className="flex justify-between items-center">
                    <span className="font-bold text-base">Final Net</span>
                    <p className={`text-2xl font-bold ${valueColor}`}>{formatNumber(finalValue)}</p>
                </div>
            </div>
        </Card>
    )
}

type AdminPanelProps = {
  accounts: Account[];
};


export default function AdminPanel({ accounts }: AdminPanelProps) {
    const brokerRawDrawTotals = draws.reduce((acc, drawName) => {
        acc[drawName] = accounts.reduce((drawTotal, account) => {
            const drawData = account.draws?.[drawName];
            return drawTotal + (drawData?.totalAmount || 0);
        }, 0);
        return acc;
    }, {} as { [key: string]: number });
  
    const brokerPassingDrawTotals = draws.reduce((acc, drawName) => {
        acc[drawName] = accounts.reduce((drawTotal, account) => {
            const drawData = account.draws?.[drawName];
            return drawTotal + (drawData?.passingAmount || 0);
        }, 0);
        return acc;
    }, {} as { [key: string]: number });

    // Calculate the final net total from the perspective of the upper broker
    const finalNetTotalForBroker = draws.reduce((totalNet, drawName) => {
        const defaultUpperComm = 0.20; // 20%
        const defaultUpperPair = 80;

        const totalAmountForDraw = brokerRawDrawTotals[drawName] || 0;
        if (totalAmountForDraw === 0) return totalNet;

        const totalPassingAmountForDraw = accounts.reduce((totalPassing, account) => {
            const drawData = account.draws?.[drawName];
            return totalPassing + (drawData?.passingAmount || 0);
        }, 0);
    
        // Calculate what the user owes to their upper broker
        const upperCommission = totalAmountForDraw * defaultUpperComm;
        const upperNet = totalAmountForDraw - upperCommission;
        const upperWinnings = totalPassingAmountForDraw * defaultUpperPair;
        const upperPayable = upperNet - upperWinnings;

        return totalNet + upperPayable;
    }, 0);

    const grandRawTotal = Object.values(brokerRawDrawTotals).reduce((sum, total) => sum + total, 0);
    const grandPassingTotal = Object.values(brokerPassingDrawTotals).reduce((sum, total) => sum + total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Panel</CardTitle>
        <CardDescription>Manage your application settings and users here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                <Landmark className="h-5 w-5" /> All Draws Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {draws.map(drawName => (
                    <BrokerDrawSummaryCard 
                        key={drawName}
                        title={drawName} 
                        rawTotal={brokerRawDrawTotals[drawName] || 0} 
                        passingTotal={brokerPassingDrawTotals[drawName] || 0}
                    />
                ))}
                <GrandTotalSummaryCard
                  title="Final Summary"
                  finalValue={finalNetTotalForBroker}
                  grandRawTotal={grandRawTotal}
                  grandPassingTotal={grandPassingTotal}
                />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
