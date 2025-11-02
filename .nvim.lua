vim.g.autoformat = false

vim.api.nvim_create_autocmd("BufWritePre", {
  pattern = { "*.ts", "*.tsx", "*.js", "*.jsx" },
  callback = function()
    -- Use pcall so it doesn't error if the command isn't ready yet
    pcall(vim.cmd, "LspEslintFixAll")
  end,
})

vim.notify("Project Config Loaded: Conform Disabled, ESLint LSP Enabled")
