-- Create the product-images bucket
insert into storage.buckets (id, name, public) 
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Allow public read access (so anyone can see the images)
create policy "Public Access" 
  on storage.objects for select 
  using ( bucket_id = 'product-images' );

-- Allow admins to upload images
create policy "Admin Upload" 
  on storage.objects for insert 
  with check ( bucket_id = 'product-images' and public.is_admin() );

-- Allow admins to update images
create policy "Admin Update" 
  on storage.objects for update 
  using ( bucket_id = 'product-images' and public.is_admin() );

-- Allow admins to delete images
create policy "Admin Delete" 
  on storage.objects for delete 
  using ( bucket_id = 'product-images' and public.is_admin() );
