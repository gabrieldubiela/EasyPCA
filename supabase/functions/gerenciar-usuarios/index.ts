
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function resposta(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function textoOpcional(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  return valor.trim() || null
}

function perfilValido(perfil: unknown): boolean {
  return perfil === 'administrador' || perfil === 'servidor'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return resposta({ erro: 'Método não permitido.' }, 405)
  }

  try {
    const authorization = req.headers.get('Authorization')

    if (!authorization?.startsWith('Bearer ')) {
      return resposta({ erro: 'Sessão não informada.' }, 401)
    }

    const token = authorization.slice(7)

    const supabaseUsuario = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authorization },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    )

    const {
      data: { user },
      error: erroAutenticacao,
    } = await supabaseUsuario.auth.getUser(token)

    if (erroAutenticacao || !user) {
      return resposta({ erro: 'Sessão inválida ou expirada.' }, 401)
    }

    const { data: perfilSolicitante, error: erroPerfilSolicitante } =
      await supabaseUsuario
        .from('perfis_usuarios')
        .select('perfil')
        .eq('id', user.id)
        .maybeSingle()

    if (
      erroPerfilSolicitante ||
      perfilSolicitante?.perfil !== 'administrador'
    ) {
      return resposta(
        { erro: 'Apenas administradores podem gerenciar usuários.' },
        403,
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    )

    const corpo = await req.json()
    const acao = corpo.acao

    // Lista usuários do Auth e combina com os perfis.
    if (acao === 'listar') {
      const { data: usuarios, error: erroUsuarios } =
        await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        })

      if (erroUsuarios) {
        return resposta({ erro: 'Não foi possível listar os usuários.' }, 500)
      }

      const { data: perfis, error: erroPerfis } =
        await supabaseAdmin
          .from('perfis_usuarios')
          .select('id, nome, sobrenome, cargo, perfil, criado_em')

      if (erroPerfis) {
        return resposta({ erro: 'Não foi possível consultar os perfis.' }, 500)
      }

      const perfisPorId = new Map(
        (perfis ?? []).map((item) => [item.id, item]),
      )

      const resultado = usuarios.users.map((usuario) => {
        const dadosPerfil = perfisPorId.get(usuario.id)

        return {
          id: usuario.id,
          nome: dadosPerfil?.nome ?? '',
          sobrenome: dadosPerfil?.sobrenome ?? null,
          cargo: dadosPerfil?.cargo ?? null,
          email: usuario.email ?? '',
          perfil: dadosPerfil?.perfil ?? '',
          criado_em: dadosPerfil?.criado_em ?? usuario.created_at,
          email_confirmado: Boolean(usuario.email_confirmed_at),
        }
      })

      return resposta({ usuarios: resultado })
    }

    // Cadastra uma nova conta e seu perfil.
    if (acao === 'cadastrar') {
      const nome =
        typeof corpo.nome === 'string' ? corpo.nome.trim() : ''
      const sobrenome = textoOpcional(corpo.sobrenome)
      const cargo = textoOpcional(corpo.cargo)
      const email =
        typeof corpo.email === 'string'
          ? corpo.email.trim().toLowerCase()
          : ''
      const senha =
        typeof corpo.senha === 'string' ? corpo.senha : ''
      const novoPerfil = corpo.perfil

      if (!nome || !email || senha.length < 8) {
        return resposta(
          { erro: 'Informe nome, e-mail e senha com pelo menos 8 caracteres.' },
          400,
        )
      }

      if (!perfilValido(novoPerfil)) {
        return resposta({ erro: 'Perfil inválido.' }, 400)
      }

      const { data: novoUsuario, error: erroCriacao } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
        })

      if (erroCriacao || !novoUsuario.user) {
        return resposta(
          { erro: erroCriacao?.message ?? 'Não foi possível criar o usuário.' },
          400,
        )
      }

      const { error: erroCadastroPerfil } = await supabaseAdmin
        .from('perfis_usuarios')
        .upsert({
          id: novoUsuario.user.id,
          nome,
          sobrenome,
          cargo,
          perfil: novoPerfil,
        })

      if (erroCadastroPerfil) {
        await supabaseAdmin.auth.admin.deleteUser(novoUsuario.user.id)

        return resposta(
          { erro: 'Não foi possível salvar o perfil do usuário.' },
          500,
        )
      }

      return resposta(
        {
          mensagem: 'Usuário cadastrado com sucesso.',
          id: novoUsuario.user.id,
        },
        201,
      )
    }

    // Edita dados pessoais, perfil e, opcionalmente, e-mail e senha.
    if (acao === 'editar') {
      const id = corpo.id
      const nome =
        typeof corpo.nome === 'string' ? corpo.nome.trim() : ''
      const sobrenome = textoOpcional(corpo.sobrenome)
      const cargo = textoOpcional(corpo.cargo)
      const novoPerfil = corpo.perfil

      const emailInformado =
        typeof corpo.email === 'string' && corpo.email.trim() !== ''
      const novoEmail = emailInformado
        ? corpo.email.trim().toLowerCase()
        : null

      const senhaInformada =
        typeof corpo.senha === 'string' && corpo.senha.length > 0
      const novaSenha = senhaInformada ? corpo.senha : null

      if (
        typeof id !== 'string' ||
        !nome ||
        !perfilValido(novoPerfil)
      ) {
        return resposta({ erro: 'Dados para edição inválidos.' }, 400)
      }

      if (senhaInformada && novaSenha!.length < 8) {
        return resposta(
          { erro: 'A nova senha deve ter pelo menos 8 caracteres.' },
          400,
        )
      }

      if (id === user.id && novoPerfil !== 'administrador') {
        return resposta(
          { erro: 'Você não pode remover seu próprio perfil de administrador.' },
          400,
        )
      }

      const { data: usuarioAlvo, error: erroBusca } =
        await supabaseAdmin.auth.admin.getUserById(id)

      if (erroBusca || !usuarioAlvo.user) {
        return resposta({ erro: 'Usuário não encontrado.' }, 404)
      }

      // Impede a remoção do último administrador.
      if (
        usuarioAlvo.user.id &&
        usuarioAlvo.user.id !== '' &&
        novoPerfil !== 'administrador'
      ) {
        const { count, error } = await supabaseAdmin
          .from('perfis_usuarios')
          .select('id', { count: 'exact', head: true })
          .eq('perfil', 'administrador')

        if (error) {
          return resposta({ erro: 'Não foi possível verificar os administradores.' }, 500)
        }

        const { data: perfilAtual } = await supabaseAdmin
          .from('perfis_usuarios')
          .select('perfil')
          .eq('id', id)
          .maybeSingle()

        if (perfilAtual?.perfil === 'administrador' && (count ?? 0) <= 1) {
          return resposta(
            { erro: 'Não é possível remover o último administrador.' },
            400,
          )
        }
      }

      const atualizacaoAuth: {
        email?: string
        email_confirm?: boolean
        password?: string
      } = {}

      if (novoEmail) {
        atualizacaoAuth.email = novoEmail
        atualizacaoAuth.email_confirm = true
      }

      if (novaSenha) {
        atualizacaoAuth.password = novaSenha
      }

      // Atualiza primeiro a conta do Auth, quando necessário.
      if (Object.keys(atualizacaoAuth).length > 0) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          id,
          atualizacaoAuth,
        )

        if (error) {
          return resposta(
            { erro: `Não foi possível atualizar a conta: ${error.message}` },
            400,
          )
        }
      }

      const dadosAtualizados = {
        nome,
        sobrenome,
        cargo,
        perfil: novoPerfil,
      }

      const { data: perfilAlvo, error: erroBuscaPerfil } =
        await supabaseAdmin
          .from('perfis_usuarios')
          .select('id')
          .eq('id', id)
          .maybeSingle()

      if (erroBuscaPerfil) {
        return resposta({ erro: 'Não foi possível consultar o perfil.' }, 500)
      }

      const { error: erroAtualizacao } = perfilAlvo
        ? await supabaseAdmin
            .from('perfis_usuarios')
            .update(dadosAtualizados)
            .eq('id', id)
        : await supabaseAdmin
            .from('perfis_usuarios')
            .insert({ id, ...dadosAtualizados })

      if (erroAtualizacao) {
        return resposta(
          { erro: 'A conta foi processada, mas não foi possível salvar o perfil. Verifique os dados antes de tentar novamente.' },
          500,
        )
      }

      return resposta({ mensagem: 'Usuário atualizado com sucesso.' })
    }

    // Exclui a conta e seu perfil.
    if (acao === 'excluir') {
      const id = corpo.id

      if (typeof id !== 'string' || !id) {
        return resposta({ erro: 'Identificador do usuário inválido.' }, 400)
      }

      if (id === user.id) {
        return resposta(
          { erro: 'Você não pode excluir sua própria conta por esta tela.' },
          400,
        )
      }

      const { data: usuarioAlvo, error: erroBusca } =
        await supabaseAdmin.auth.admin.getUserById(id)

      if (erroBusca || !usuarioAlvo.user) {
        return resposta({ erro: 'Usuário não encontrado.' }, 404)
      }

      const { data: perfilAlvo, error: erroPerfilAlvo } =
        await supabaseAdmin
          .from('perfis_usuarios')
          .select('perfil')
          .eq('id', id)
          .maybeSingle()

      if (erroPerfilAlvo) {
        return resposta({ erro: 'Não foi possível consultar o perfil.' }, 500)
      }

      if (perfilAlvo?.perfil === 'administrador') {
        const { count, error } = await supabaseAdmin
          .from('perfis_usuarios')
          .select('id', { count: 'exact', head: true })
          .eq('perfil', 'administrador')

        if (error) {
          return resposta({ erro: 'Não foi possível verificar os administradores.' }, 500)
        }

        if ((count ?? 0) <= 1) {
          return resposta(
            { erro: 'Não é possível excluir o último administrador.' },
            400,
          )
        }
      }

      // Exclui a conta de autenticação. A exclusão do perfil depende
      // da relação entre perfis_usuarios.id e auth.users.id.
      const { error: erroExclusao } =
        await supabaseAdmin.auth.admin.deleteUser(id)

      if (erroExclusao) {
        return resposta(
          { erro: `Não foi possível excluir a conta: ${erroExclusao.message}` },
          400,
        )
      }

      // Garante a remoção do perfil caso a FK não tenha feito CASCADE.
      const { error: erroRemocaoPerfil } = await supabaseAdmin
        .from('perfis_usuarios')
        .delete()
        .eq('id', id)

      if (erroRemocaoPerfil) {
        return resposta(
          { erro: 'A conta foi excluída, mas não foi possível remover o perfil. Verifique o banco de dados.' },
          500,
        )
      }

      return resposta({ mensagem: 'Usuário excluído com sucesso.' })
    }

    return resposta({ erro: 'Ação não reconhecida.' }, 400)
  } catch (error) {
    console.error('Erro na função gerenciar-usuarios:', error)

    return resposta(
      { erro: 'Ocorreu um erro interno ao processar a solicitação.' },
      500,
    )
  }
})
