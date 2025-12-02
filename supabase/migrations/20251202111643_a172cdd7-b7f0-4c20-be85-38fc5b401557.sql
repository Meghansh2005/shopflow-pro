-- Create shops table
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  shop_address TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_contact TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_stock NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  low_stock_threshold NUMERIC(10,2) DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('fixed', 'guest')),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  balance_due NUMERIC(10,2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  final_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  amount_due NUMERIC(10,2) DEFAULT 0,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create temple_orders table
CREATE TABLE public.temple_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  temple_name TEXT NOT NULL,
  event_location TEXT NOT NULL,
  date_of_requirement DATE NOT NULL,
  contact_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create temple_order_items table
CREATE TABLE public.temple_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.temple_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temple_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temple_order_items ENABLE ROW LEVEL SECURITY;

-- Create helper function to get user's shop_id
CREATE OR REPLACE FUNCTION public.get_user_shop_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.shops WHERE user_id = auth.uid() LIMIT 1;
$$;

-- RLS Policies for shops
CREATE POLICY "Users can view their own shop"
  ON public.shops FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own shop"
  ON public.shops FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own shop"
  ON public.shops FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for products
CREATE POLICY "Users can view their shop products"
  ON public.products FOR SELECT
  USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can create products for their shop"
  ON public.products FOR INSERT
  WITH CHECK (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can update their shop products"
  ON public.products FOR UPDATE
  USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can delete their shop products"
  ON public.products FOR DELETE
  USING (shop_id = public.get_user_shop_id());

-- RLS Policies for customers
CREATE POLICY "Users can view their shop customers"
  ON public.customers FOR SELECT
  USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can create customers for their shop"
  ON public.customers FOR INSERT
  WITH CHECK (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can update their shop customers"
  ON public.customers FOR UPDATE
  USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can delete their shop customers"
  ON public.customers FOR DELETE
  USING (shop_id = public.get_user_shop_id());

-- RLS Policies for invoices
CREATE POLICY "Users can view their shop invoices"
  ON public.invoices FOR SELECT
  USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can create invoices for their shop"
  ON public.invoices FOR INSERT
  WITH CHECK (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can update their shop invoices"
  ON public.invoices FOR UPDATE
  USING (shop_id = public.get_user_shop_id());

-- RLS Policies for invoice_items
CREATE POLICY "Users can view their shop invoice items"
  ON public.invoice_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.shop_id = public.get_user_shop_id()
  ));

CREATE POLICY "Users can create invoice items for their shop"
  ON public.invoice_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.shop_id = public.get_user_shop_id()
  ));

-- RLS Policies for temple_orders
CREATE POLICY "Users can view their shop temple orders"
  ON public.temple_orders FOR SELECT
  USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can create temple orders for their shop"
  ON public.temple_orders FOR INSERT
  WITH CHECK (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can update their shop temple orders"
  ON public.temple_orders FOR UPDATE
  USING (shop_id = public.get_user_shop_id());

CREATE POLICY "Users can delete their shop temple orders"
  ON public.temple_orders FOR DELETE
  USING (shop_id = public.get_user_shop_id());

-- RLS Policies for temple_order_items
CREATE POLICY "Users can view their shop temple order items"
  ON public.temple_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.temple_orders
    WHERE temple_orders.id = temple_order_items.order_id
    AND temple_orders.shop_id = public.get_user_shop_id()
  ));

CREATE POLICY "Users can create temple order items for their shop"
  ON public.temple_order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.temple_orders
    WHERE temple_orders.id = temple_order_items.order_id
    AND temple_orders.shop_id = public.get_user_shop_id()
  ));

CREATE POLICY "Users can delete temple order items for their shop"
  ON public.temple_order_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.temple_orders
    WHERE temple_orders.id = temple_order_items.order_id
    AND temple_orders.shop_id = public.get_user_shop_id()
  ));

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER temple_orders_updated_at
  BEFORE UPDATE ON public.temple_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();