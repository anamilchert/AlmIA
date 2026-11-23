import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClinicConfig from '../../src/pages/ClinicConfig/ClinicConfig';
import { getClinicConfig, saveClinicConfig } from '../../src/api/clinicConfigApi';

vi.mock('../../src/api/clinicConfigApi', () => ({
  getClinicConfig: vi.fn(),
  saveClinicConfig: vi.fn(),
}));

const configBase = () => ({
  dadosGerais: {
    nomeClinica: 'Clínica Doutor Ortopedia',
    cnpj: '',
    telefonePrincipal: '',
    whatsappAtendimento: '',
    endereco: '',
    site: '',
  },
  horarios: [],
  convenios: ['Amil'],
  listaEspecialidades: ['Ortopedia'],
  medicos: [{ nome: 'Dr. Ricardo', especialidade: 'Ortopedia', valorConsulta: 250 }],
  preparoExames: [],
  mensagensBot: { boasVindas: '', foraHorario: '' },
  avancado: {},
});

async function abrirSecao(nome) {
  await userEvent.click(screen.getByText(nome, { selector: '.page-nav-item' }));
}

beforeEach(() => {
  getClinicConfig.mockReset();
  saveClinicConfig.mockReset();
  getClinicConfig.mockResolvedValue(configBase());
  saveClinicConfig.mockImplementation(async (dados) => dados);
});

describe('ClinicConfig', () => {
  it('mostra "Carregando..." e depois a tela de configurações', async () => {
    render(<ClinicConfig />);
    expect(screen.getByText('Carregando configurações...')).toBeInTheDocument();
    expect(await screen.findByText('Configurações da clínica')).toBeInTheDocument();
  });

  it('avisa quando não consegue carregar as configurações', async () => {
    getClinicConfig.mockRejectedValue(new Error('fora do ar'));
    render(<ClinicConfig />);
    expect(await screen.findByText('Não foi possível carregar as configurações.')).toBeInTheDocument();
  });

  it('mostra o valor da consulta de cada médico', async () => {
    render(<ClinicConfig />);
    await screen.findByText('Configurações da clínica');
    await abrirSecao('Especialidades e médicos');

    expect(screen.getByLabelText('Valor da consulta de Dr. Ricardo')).toHaveValue(250);
  });

  it('adiciona um médico com o valor da consulta', async () => {
    render(<ClinicConfig />);
    await screen.findByText('Configurações da clínica');
    await abrirSecao('Especialidades e médicos');

    await userEvent.type(screen.getByPlaceholderText('Nome do médico...'), 'Dr. Paulo');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Ortopedia');
    fireEvent.change(screen.getByPlaceholderText('Valor (R$)'), { target: { value: '300' } });
    await userEvent.click(screen.getAllByRole('button', { name: /Adicionar/ })[1]);

    expect(screen.getByLabelText('Valor da consulta de Dr. Paulo')).toHaveValue(300);
  });

  it('adiciona um médico sem valor quando o campo fica vazio', async () => {
    render(<ClinicConfig />);
    await screen.findByText('Configurações da clínica');
    await abrirSecao('Especialidades e médicos');

    await userEvent.type(screen.getByPlaceholderText('Nome do médico...'), 'Dra. Ana');
    await userEvent.click(screen.getAllByRole('button', { name: /Adicionar/ })[1]);

    expect(screen.getByLabelText('Valor da consulta de Dra. Ana')).toHaveValue(null);
  });

  it('atualiza o valor da consulta de um médico existente', async () => {
    render(<ClinicConfig />);
    await screen.findByText('Configurações da clínica');
    await abrirSecao('Especialidades e médicos');

    const campo = screen.getByLabelText('Valor da consulta de Dr. Ricardo');
    fireEvent.change(campo, { target: { value: '400' } });
    expect(campo).toHaveValue(400);

    fireEvent.change(campo, { target: { value: '-5' } });
    expect(campo).toHaveValue(null);
  });

  it('envia na hora de salvar o valor e a opção de consulta particular', async () => {
    render(<ClinicConfig />);
    await screen.findByText('Configurações da clínica');

    await abrirSecao('Especialidades e médicos');
    fireEvent.change(screen.getByLabelText('Valor da consulta de Dr. Ricardo'), {
      target: { value: '500' },
    });

    await abrirSecao('Convênios');
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));

    await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }));

    expect(saveClinicConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        aceitaParticular: false,
        medicos: [expect.objectContaining({ nome: 'Dr. Ricardo', valorConsulta: 500 })],
      })
    );
    await waitFor(() => expect(screen.getByText('Salvo').closest('span')).toHaveClass('visible'));
  });

  it('mostra o erro quando salvar falha', async () => {
    saveClinicConfig.mockRejectedValue(new Error('Erro na requisição.'));
    render(<ClinicConfig />);
    await screen.findByText('Configurações da clínica');

    await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }));

    expect(await screen.findByText('Erro na requisição.')).toBeInTheDocument();
  });
});