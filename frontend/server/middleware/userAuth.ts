import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const path = event.path

  if (!path.startsWith('/api/user')) {
    return
  }

  const headers = getRequestHeaders(event)
  const authHeader = headers['authorization'] as string | undefined

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(
      `User authentication failed for path: ${path} - Missing or invalid Authorization header`
    )
    throw createError({
      statusCode: 401,
      message: 'Unauthorized: Missing or invalid Authorization header',
    })
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration is missing')
    throw createError({
      statusCode: 500,
      message: 'Server configuration error',
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    console.warn(`User authentication failed for path: ${path} - Invalid token or user not found`)
    throw createError({
      statusCode: 401,
      message: 'Unauthorized: Invalid token or user not found',
    })
  }

  event.context.user = {
    id: user.id,
    email: user.email,
  }

  console.log(`User access granted for path: ${path}, user: ${user.email}`)
})
