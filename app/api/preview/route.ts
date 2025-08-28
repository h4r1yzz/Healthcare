import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    
    // Get the size parameter from query string if provided
    const { searchParams } = new URL(request.url)
    const size = searchParams.get('size') || '256'
    
    // Forward the request to the FastAPI backend
    const backendUrl = `http://localhost:8000/preview?size=${size}`
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      return NextResponse.json(
        { error: errorData.detail || `Backend error: ${response.status}` },
        { status: response.status }
      )
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer()
    
    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache', // Don't cache temporary previews
        'Content-Disposition': `inline; filename=preview_${size}x${size}.png`
      },
    })
  } catch (error) {
    console.error('Preview API error:', error)
    return NextResponse.json(
      { error: 'Failed to process preview request' },
      { status: 500 }
    )
  }
}
