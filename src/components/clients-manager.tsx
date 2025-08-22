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

type Client = {
  id: string
  name: string
  pair: string
  comm: string
  inOut: string
  patti: string
}

const initialClients: Client[] = []

export default function ClientsManager() {
  const [clients, setClients] = useState<Client[]>(initialClients)
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

    if (editingClient) {
      setClients(clients.map(c => c.id === editingClient.id ? { ...c, name, pair, comm, inOut, patti } : c))
    } else {
      const newClient: Client = { id: Date.now().toString(), name, pair, comm, inOut, patti }
      setClients([...clients, newClient])
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
    setClients(clients.filter(c => c.id !== id))
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Pair</TableHead>
              <TableHead>Comm</TableHead>
              <TableHead>In/Out</TableHead>
              <TableHead>Patti</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map(client => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.pair}</TableCell>
                <TableCell>{client.comm}</TableCell>
                <TableCell>{client.inOut}</TableCell>
                <TableCell>{client.patti}</TableCell>
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
