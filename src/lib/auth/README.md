# Authentication integration boundary

Authentication is intentionally not implemented in this MVP. A future integration must validate sessions on the server, apply role and account-state authorization on the server, and use Supabase Row Level Security for database access. Client state and hidden links must never be treated as security controls.
