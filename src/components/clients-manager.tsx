
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Account } from "./accounts-manager"
import { formatNumber } from "@/lib/utils"

export type Client = {
  id: string
  name: string
  pair: string
  comm: string
  inOut: string
  patti: string
  activeBalance: string;
}

type ClientsManagerProps = {
  clients: Client[];
  accounts: Account[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientsManager({ clients, accounts, onAddClient, onUpdateClient, onDeleteClient }: ClientsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const handleSaveClient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const pair = formData.get("pair") as string
    const comm = formData.get("comm") as string
    const inOut = formData.get("inOut") as string
    const patti = formData.get("patti") as string
    const activeBalance = formData.get("activeBalance") as string;

    if (editingClient) {
      const updatedClient = { ...editingClient, name, pair, comm, inOut, patti, activeBalance };
      onUpdateClient(updatedClient);
    } else {
      const newClient: Client = { id: Date.now().toString(), name, pair, comm, inOut, patti, activeBalance }
      onAddClient(newClient);
    }
    setEditingClient(null)
    setIsDialogOpen(false)
    e.currentTarget.reset();
  }
  
  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setIsDialogOpen(true)
  }

  const handleDeleteClient = (id: string) => {
    onDeleteClient(id);
  }

  const openAddDialog = () => {
    setEditingClient(null)
    setIsDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manage Clients</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setEditingClient(null);
          }
          setIsDialogOpen(open)
        }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openAddDialog}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editingClient?.name} placeholder="Enter name" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pair">Pair</Label>
                  <Input id="pair" name="pair" defaultValue={editingClient?.pair} placeholder="Pair" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comm">Comm</Label>
                  <Input id="comm" name="comm" defaultValue={editingClient?.comm} placeholder="Comm" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inOut">In/Out</Label>
                  <Input id="inOut" name="inOut" defaultValue={editingClient?.inOut} placeholder="In/Out" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patti">Patti</Label>
                  <Input id="patti" name="patti" defaultValue={editingClient?.patti} placeholder="Patti" required />
                </div>
              </div>
              <div>
                <Label htmlFor="activeBalance">Active Balance</Label>
                <Input id="activeBalance" name="activeBalance" defaultValue={editingClient?.activeBalance} placeholder="e.g. 1000" />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SI.No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Comm</TableHead>
                <TableHead>In/Out</TableHead>
                <TableHead>Patti</TableHead>
                <TableHead>Active Balance</TableHead>
                <TableHead>Remaining Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client, index) => {
                const account = accounts.find(acc => acc.id === client.id);
                const activeBalance = parseFloat(client.activeBalance) || 0;

                const totalPlayed = account ? Object.values(account.draws || {}).reduce((sum, draw) => sum + (draw.totalAmount || 0), 0) : 0;
                
                const remainingBalance = activeBalance > 0 ? activeBalance - totalPlayed : 0;
                const balanceColor = remainingBalance >= 0 ? 'text-green-400' : 'text-red-500';

                return (
                  <TableRow key={client.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.pair}</TableCell>
                    <TableCell>{client.comm}</TableCell>
                    <TableCell>{client.inOut}</TableCell>
                    <TableCell>{client.patti}</TableCell>
                    <TableCell>{activeBalance > 0 ? formatNumber(activeBalance) : '-'}</TableCell>
                    <TableCell className={balanceColor}>{activeBalance > 0 ? formatNumber(remainingBalance) : '-'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClient(client)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive" onClick={() => handleDeleteClient(client.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
