'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Calendar, MapPin, DollarSign } from 'lucide-react'
import { format } from 'date-fns'

interface Event {
  id: string
  title: string
  description: string
  venue: string
  date: string
  category: string
  imageUrl?: string
  basePrice: number
  organizer: {
    name: string
  }
  _count: {
    tickets: number
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')

  useEffect(() => {
    fetchEvents()
  }, [category])

  const fetchEvents = async () => {
    try {
      const url = category
        ? `/api/events?category=${category}`
        : '/api/events'
      const res = await fetch(url)
      const data = await res.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    'All',
    'Music',
    'Sports',
    'Theater',
    'Conference',
    'Festival',
    'Workshop',
    'Other',
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading events...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-2">
            Discover <span className="gradient-text">Events</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">Find amazing events happening near you</p>

          <div className="flex flex-wrap gap-3 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat === 'All' ? '' : cat)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 ${
                  (cat === 'All' && !category) || category === cat
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-white text-gray-700 hover:bg-primary-50 hover:border-primary-300 border-2 border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {events.map((event, index) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card variant="elevated" className="hover:shadow-glow-xl transition-all duration-700 cursor-pointer h-full hover-lift group animate-fade-in-up shine premium-border" style={{ animationDelay: `${index * 50}ms` }}>
                {event.imageUrl && (
                  <div className="relative overflow-hidden rounded-xl mb-4 -mx-6 -mt-6">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-48 object-cover transition-transform duration-1000 group-hover:scale-125"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/10 transition-all duration-700" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-primary-600 transition-colors">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary-500" />
                      <span className="font-medium">{format(new Date(event.date), 'MMM dd, yyyy • h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-500" />
                      <span className="font-medium">{event.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary-500" />
                      <span className="font-bold text-lg gradient-text">${event.basePrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <span className="text-sm text-primary-600 font-bold">
                      {event.organizer.name}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {events.length === 0 && (
          <Card variant="elevated" className="text-center py-16 animate-fade-in-up">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-gray-600 text-xl font-semibold mb-2">No events found</p>
            <p className="text-gray-500">Try selecting a different category</p>
          </Card>
        )}
      </div>
    </div>
  )
}

