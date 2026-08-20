import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon
} from 'lucide-react'

import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { API_CONFIG, buildApiUrl } from '@/lib/api'
import { cn } from '@/lib/utils'

type Item = {
  id: string
  title: string
  sport: string
  category: string
  difficulty: number
  durationMin: number
  createdAt: string
}

type IntervalPlanApiItem = {
  id: string
  plan?: {
    workout_header?: {
      title?: string
      sport?: string
      category?: string
      difficulty_score?: number
      estimated_total_duration_min?: number
    }
  }
  createdAt?: string
}

const columns: ColumnDef<Item>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label='Select row'
      />
    ),
    size: 28,
    enableSorting: false
  },
  {
    header: 'Plan',
    accessorKey: 'title',
    cell: ({ row }) => <div className='font-medium'>{row.getValue('title')}</div>
  },
  {
    header: 'Sport',
    accessorKey: 'sport',
    cell: ({ row }) => {
      const sport = row.getValue('sport') as string

      const styles = {
        Ride:
          'bg-blue-600/10 text-blue-600 focus-visible:ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-400 dark:focus-visible:ring-blue-400/40 [a&]:hover:bg-blue-600/5 dark:[a&]:hover:bg-blue-400/5',
        Run:
          'bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5'
      }[sport]

      return <Badge className={cn('border-none focus-visible:outline-none', styles)}>{sport}</Badge>
    }
  },
  {
    header: 'Category',
    accessorKey: 'category',
    cell: ({ row }) => <div className='font-medium'>{row.getValue('category')}</div>
  },
  {
    header: 'Diff',
    accessorKey: 'difficulty',
    cell: ({ row }) => <div className='font-medium'>{row.getValue('difficulty')}</div>
  },
  {
    header: 'Duration',
    accessorKey: 'durationMin',
    cell: ({ row }) => <div className='font-medium'>{row.getValue('durationMin')} min</div>
  },
  {
    header: 'Created',
    accessorKey: 'createdAt',
    cell: ({ row }) => {
      const value = row.getValue('createdAt') as string
      const date = new Date(value)
      return <div className='font-medium'>{Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString()}</div>
    }
  }
]

interface IntervalPlansTableProps {
  refreshKey?: number
}

const IntervalPlansTable = ({ refreshKey = 0 }: IntervalPlansTableProps) => {
  const id = useId()

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5
  })

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'createdAt',
      desc: false
    }
  ])

  const [data, setData] = useState<Item[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchPosts() {
      const res = await fetch(
        buildApiUrl(API_CONFIG.endpoints.intervalPlans.paginated({ page: 1, limit: 10 })),
        {
          credentials: API_CONFIG.defaultOptions.credentials
        }
      )

      if (!res.ok) {
        throw new Error('Failed to fetch data')
      }

      const response = await res.json()

      const rawItems: IntervalPlanApiItem[] = Array.isArray(response?.data?.items) ? response.data.items : []

      const mappedItems: Item[] = rawItems.map(item => {
        const workoutHeader = item.plan?.workout_header

        return {
          id: item.id,
          title: workoutHeader?.title ?? 'Untitled plan',
          sport: workoutHeader?.sport ?? '-',
          category: workoutHeader?.category ?? '-',
          difficulty: workoutHeader?.difficulty_score ?? 0,
          durationMin: workoutHeader?.estimated_total_duration_min ?? 0,
          createdAt: item.createdAt ?? ''
        }
      })

      setData(mappedItems)
    }

    fetchPosts()
  }, [refreshKey])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting,
      pagination
    }
  })

  return (
    <div className='space-y-4 md:w-full'>
      <div className='rounded-md border  border-third'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className='hover:bg-transparent text-white'>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead key={header.id} style={{ width: `${header.getSize()}px` }} className='h-11'>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <div
                          className={cn(
                            header.column.getCanSort() &&
                              'flex h-full cursor-pointer items-center justify-between gap-2 select-none'
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={e => {
                            if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault()
                              header.column.getToggleSortingHandler()?.(e)
                            }
                          }}
                          tabIndex={header.column.getCanSort() ? 0 : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <ChevronUpIcon className='shrink-0 opacity-60' size={16} aria-hidden='true' />,
                            desc: <ChevronDownIcon className='shrink-0 opacity-60' size={16} aria-hidden='true' />
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
                <TableHead className='h-11'>Action</TableHead>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected text-white'}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                  <TableCell>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => navigate(`/main/interval-plans/${row.original.id}`)}
                    >
                      Check
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className='h-24 text-center'>
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex items-center justify-between gap-8'>
        <div className='flex items-center gap-3'>
          <Label htmlFor={id} className='max-sm:sr-only text-white'>
            Rows per page
          </Label>
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={value => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger id={id} className='w-fit whitespace-nowrap text-white'>
              <SelectValue placeholder='Select number of results' />
            </SelectTrigger>
            <SelectContent className='[&_*[role=option]]:pr-8 [&_*[role=option]]:pl-2 [&_*[role=option]>span]:right-2 [&_*[role=option]>span]:left-auto'>
              {[5, 10, 25, 50].map(pageSize => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='text-muted-foreground flex grow justify-end text-sm whitespace-nowrap'>
          <p className='text-muted-foreground text-sm whitespace-nowrap' aria-live='polite'>
            <span className='text-foreground'>
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
              {Math.min(
                Math.max(
                  table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
                    table.getState().pagination.pageSize,
                  0
                ),
                table.getRowCount()
              )}
            </span>{' '}
            of <span className='text-foreground'>{table.getRowCount().toString()}</span>
          </p>
        </div>

        <div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  size='icon'
                  variant='secondary'
                  className='disabled:pointer-events-none disabled:opacity-50'
                  onClick={() => table.firstPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label='Go to first page'
                >
                  <ChevronFirstIcon aria-hidden='true' />
                </Button>
              </PaginationItem>

              <PaginationItem>
                <Button
                  size='icon'
                  variant='secondary'
                  className='disabled:pointer-events-none disabled:opacity-50'
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label='Go to previous page'
                >
                  <ChevronLeftIcon aria-hidden='true' />
                </Button>
              </PaginationItem>

              <PaginationItem>
                <Button
                  size='icon'
                  variant='secondary'
                  className='disabled:pointer-events-none disabled:opacity-50'
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label='Go to next page'
                >
                  <ChevronRightIcon aria-hidden='true' />
                </Button>
              </PaginationItem>

              <PaginationItem>
                <Button
                  size='icon'
                  variant='secondary'
                  className='disabled:pointer-events-none disabled:opacity-50'
                  onClick={() => table.lastPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label='Go to last page'
                >
                  <ChevronLastIcon aria-hidden='true' />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}

export default IntervalPlansTable
