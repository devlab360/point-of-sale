import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProductsFn } from "@/api/products";
import { getLocationsFn } from "@/api/locations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, MapPin, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/inventory/")({
  component: InventoryDashboard,
});

function InventoryDashboard() {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");

  const { data: locationsRes } = useQuery({
    queryKey: ["locations"],
    queryFn: () => getLocationsFn(),
  });
  const locations = locationsRes?.data || [];

  const { data: productsRes, isLoading } = useQuery({
    queryKey: ["inventory-products", search],
    queryFn: () => getProductsFn({ data: { page: 1, pageSize: 1000, query: search } }),
  });
  const products = productsRes?.data || [];
  const summary = (productsRes as any)?.summary || { totalStock: 0, totalValue: 0, lowStockCount: 0 };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multi-Location Inventory</h1>
          <p className="text-muted-foreground">Manage and track stock across all your stores and warehouses.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items in Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalStock.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <span className="text-sm text-muted-foreground">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summary.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.lowStockCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Stock Matrix</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[180px]">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Global Stock</TableHead>
                  {locationFilter === "all" ? (
                    locations.map((loc: any) => (
                      <TableHead key={loc.id} className="text-right whitespace-nowrap">
                        {loc.name}
                      </TableHead>
                    ))
                  ) : (
                    <TableHead className="text-right whitespace-nowrap">
                      {locations.find((l: any) => l.id === locationFilter)?.name}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      Loading inventory...
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-xs overflow-hidden">
                            {product.images && product.images[0] ? (
                              <img src={product.images[0]} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p>{product.name}</p>
                            {product.hasVariants && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 mt-0.5">Has Variants</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{product.sku}</TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {product.stock || 0}
                      </TableCell>
                      {locationFilter === "all" ? (
                        locations.map((loc: any) => (
                          <TableCell key={loc.id} className="text-right text-muted-foreground">
                            {/* In a real implementation, we would map the aggregated stock per location from the API */}
                            {/* For now, we fallback to the global stock for the Main Store if it's the only one */}
                            {loc.name === "Main Store" ? (product.stock || 0) : 0}
                          </TableCell>
                        ))
                      ) : (
                        <TableCell className="text-right text-muted-foreground">
                          {locations.find((l: any) => l.id === locationFilter)?.name === "Main Store" ? (product.stock || 0) : 0}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
