"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, MoreHorizontal, Edit, Trash2, ArrowUpCircle, ArrowDownCircle, Eraser } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Account } from "./accounts-manager"
import { formatNumber } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { Client } from "@/hooks/useClients"

type ClientsManagerProps = {
  clients: Client[];
  accounts: Account[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string, name: string) => void;
  onClientTransaction: (clientId: string, amount: number) => void;
  onClearClientData: (clientId: string, name: string) => void;
}

export default function ClientsManager({ clients, accounts, onAddClient, onUpdateClient, onDeleteClient, onClientTransaction, onClearClientData }: ClientsManagerProps) {
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [transactionClient, setTransactionClient] = useState<Client | null>(null);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw' | null>(null);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [dialogAction, setDialogAction] = useState<(() => void) | null>(null);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSaveClient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const pair = formData.get("pair") as string
    const comm = formData.get("comm") as string
    const inOut = formData.get("inOut") as string
    const patti = formData.get("patti") as string
    const activeBalanceStr = formData.get("activeBalance") as string;
    const activeBalance = parseFloat(activeBalanceStr) || 0;

    if (editingClient) {
      const updatedClient = { ...editingClient, name, pair, comm, inOut, patti, activeBalance };
      onUpdateClient(updatedClient);
    } else {
      const newClient: Omit<Client, 'id'> = { name, pair, comm, inOut, patti, activeBalance }
      onAddClient(newClient);
    }
    setEditingClient(null)
    setIsFormDialogOpen(false)
    e.currentTarget.reset();
  }
  
  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setIsFormDialogOpen(true)
  }

  const confirmAction = (title: string, description: string, action: () => void) => {
    setDialogTitle(title);
    setDialogDescription(description);
    setDialogAction(() => action); // Use a function to ensure the action is correctly scoped
    setIsConfirmDialogOpen(true);
  };
  
  const handleDeleteClient = (id: string, name: string) => {
    confirmAction(
      `Delete Client: ${name}?`,
      "This action cannot be undone. This will permanently delete the client and all their associated sheet data.",
      () => onDeleteClient(id, name)
    );
  };

  const handleClearClientData = (id: string, name: string) => {
    confirmAction(
      `Clear Sheet Data for ${name}?`,
      "This action cannot be undone. This will permanently delete all sheet log history for this client.",
      () => onClearClientData(id, name)
    );
  };

  const openAddDialog = () => {
    setEditingClient(null)
    setIsFormDialogOpen(true)
  }

  const openTransactionDialog = (client: Client, type: 'deposit' | 'withdraw') => {
    setTransactionClient(client);
    setTransactionType(type);
    setTransactionAmount('');
  };
  
  const handleTransaction = () => {
    if (!transactionClient || !transactionType) return;
  
    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive number.",
        variant: "destructive",
      });
      return;
    }
  
    const finalAmount = transactionType === 'deposit' ? amount : -amount;
    onClientTransaction(transactionClient.id, finalAmount);
  
    toast({
      title: "Transaction Successful",
      description: `₹${formatNumber(amount)} has been ${transactionType === 'deposit' ? 'recorded as a deposit for' : 'withdrawn from'} ${transactionClient.name}.`,
    });
  
    setTransactionClient(null);
    setTransactionType(null);
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Clients</CardTitle>
          <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setEditingClient(null);
            }
            setIsFormDialogOpen(open)
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
                  <Label htmlFor="activeBalance">Opening Balance</Label>
                  <Input id="activeBalance" name="activeBalance" type="number" defaultValue={editingClient?.activeBalance} placeholder="e.g. 1000" />
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
        <CardContent className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SI.No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>Comm</TableHead>
                  <TableHead>Net Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client, index) => {
                  const account = accounts.find(acc => acc.id === client.id);
                  const netBalance = account?.balance ?? client.activeBalance ?? 0;
                  const balanceColor = netBalance >= 0 ? 'text-green-500' : 'text-red-500';

                  return (
                    <TableRow key={client.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.pair}</TableCell>
                      <TableCell>{client.comm}%</TableCell>
                      <TableCell className={`font-bold ${balanceColor}`}>{formatNumber(netBalance)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openTransactionDialog(client, 'deposit')}>
                                <ArrowUpCircle className="mr-2 h-4 w-4 text-green-500" />
                                Deposit
                            </Button>
                             <Button variant="outline" size="sm" onClick={() => openTransactionDialog(client, 'withdraw')}>
                                <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500" />
                                Withdrawal
                            </Button>
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
                                  <span>Edit Details</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleClearClientData(client.id, client.name)}>
                                  <Eraser className="mr-2 h-4 w-4" />
                                  <span>Clear Sheet Data</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive" onClick={() => handleDeleteClient(client.id, client.name)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete Client</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      <Dialog open={!!transactionClient} onOpenChange={(open) => { if (!open) setTransactionClient(null) }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{transactionType === 'deposit' ? 'Record a Deposit for' : 'Record a Withdrawal for'} {transactionClient?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <Label htmlFor="transactionAmount">Amount</Label>
                <Input
                    id="transactionAmount"
                    type="number"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    placeholder="Enter amount"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setTransactionClient(null)}>Cancel</Button>
                <Button onClick={handleTransaction}>Confirm Transaction</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (dialogAction) {
                dialogAction();
              }
              setIsConfirmDialogOpen(false);
            }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
