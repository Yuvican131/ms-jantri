"use client"

import { useState, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GridSheet from "@/components/grid-sheet"
import ClientsManager, { Client } from "@/components/clients-manager"
import AccountsManager from "@/components/accounts-manager"
import { Users, Building, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

function GridIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7h18" />
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <path d="M17 3v18" />
      <path d="M3 17h18" />
    </svg>
  )
}


export default function Home() {
  const gridSheetRef = useRef<{ handleClientUpdate: (client: Client) => void }>(null);
  const [selectedDraw, setSelectedDraw] = useState<string | null>(null);

  const handleClientUpdateForSheet = (client: Client) => {
    if (gridSheetRef.current) {
      gridSheetRef.current.handleClientUpdate(client);
    }
  };
  
  const handleSelectDraw = (draw: string) => {
    setSelectedDraw(draw);
  };

  const handleBackToDraws = () => {
    setSelectedDraw(null);
  };

  const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GridIcon className="h-6 w-6 text-primary" />
          GridSheet Manager
        </h1>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Tabs defaultValue="sheet" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
            <TabsTrigger value="sheet">
              <GridIcon className="mr-2 h-4 w-4" />
              SHEET
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Users className="mr-2 h-4 w-4" />
              CLIENTS
            </TabsTrigger>
            <TabsTrigger value="accounts">
              <Building className="mr-2 h-4 w-4" />
              ACCOUNTS
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sheet" className="mt-4">
            {selectedDraw ? (
              <div>
                 <Button onClick={handleBackToDraws} variant="outline" className="mb-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Draws
                </Button>
                <GridSheet ref={gridSheetRef} draw={selectedDraw} />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Select a Draw</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {draws.map((draw) => (
                    <Button key={draw} onClick={() => handleSelectDraw(draw)} className="h-24 text-2xl font-bold">
                      {draw}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="clients" className="mt-4">
            <ClientsManager onClientUpdateForSheet={handleClientUpdateForSheet} />
          </TabsContent>
          <TabsContent value="accounts" className="mt-4">
            <AccountsManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
